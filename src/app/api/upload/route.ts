import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { materials, chunks, userSettings } from '@/lib/db/schema';
import { parseDocument, detectType, chunkText } from '@/lib/parsers';
import { getEmbedder } from '@/lib/ai/embed';
import { putVector } from '@/lib/vector';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Vercel Hobby plan API route body 上限 4.5MB，留点余地给 multipart 边界
const MAX_FILE_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  // Content-Length 头提前校验（Vercel 平台本身的 413 在 formData() 之前抛出，
  // 这里捕获后给用户友好提示）
  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (contentLength > MAX_FILE_BYTES * 1.5) {
    return NextResponse.json(
      {
        error: `请求过大（${Math.round(contentLength / 1024 / 1024)}MB），请将文件压缩到 4MB 以内再上传。`,
      },
      { status: 413 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch (e) {
    return NextResponse.json(
      { error: `上传失败：${(e as Error).message}（通常是文件超过 4MB 限制，请先压缩）` },
      { status: 413 },
    );
  }

  const file = form.get('file') as File | null;
  const title = (form.get('title') as string) || file?.name;
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 });

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      {
        error: `文件 ${Math.round(file.size / 1024 / 1024)}MB 超过 4MB 限制，请用 ilovepdf.com 压缩后重新上传。`,
      },
      { status: 413 },
    );
  }

  const type = detectType(file.name);
  if (!type) return NextResponse.json({ error: 'unsupported file type' }, { status: 400 });

  // 1. 落库（不存原始文件到 Blob，只存解析后的文本 chunks）
  const [mat] = await db
    .insert(materials)
    .values({
      userId,
      title: title || file.name,
      type,
      blobUrl: '', // 已改为不依赖 Blob 存储
      sizeBytes: file.size,
      status: 'processing',
    })
    .returning();

  // 2. 解析 + 切片 + 向量化
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const text = await parseDocument(buf, type);
    const chunkList = chunkText(text);

    // 拿用户设置（BYOK）
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    const apiKey = settings?.encryptedApiKey
      ? (await import('@/lib/crypto')).decryptApiKey(settings.encryptedApiKey)
      : undefined;
    const embed = getEmbedder({
      provider: settings?.llmProvider ?? 'deepseek',
      apiKey,
      model: settings?.embedModelName ?? 'text-embedding-3-small',
      baseUrl: settings?.baseUrl ?? null,
    });

    // 批量 embedding（每次最多 32 条以免超额）
    for (let i = 0; i < chunkList.length; i += 32) {
      const batch = chunkList.slice(i, i + 32);
      const embeddings = await embed.embed(batch.map((c) => c.content));
      for (let j = 0; j < batch.length; j++) {
        const c = batch[j];
        await db.insert(chunks).values({
          materialId: mat.id,
          chunkIndex: c.index,
          content: c.content,
          tokenCount: c.tokenCount,
          kvKey: `vec:${mat.id}:${c.index}`,
        });
        await putVector(mat.id, c.index, {
          embedding: embeddings[j],
          content: c.content,
        });
      }
    }

    await db.update(materials).set({ status: 'ready' }).where(eq(materials.id, mat.id));

    // 3) 触发预生成 50 道核心题（不阻塞上传返回）
    (async () => {
      try {
        const { preGenerateCoreQuestions } = await import('@/lib/jobs');
        await preGenerateCoreQuestions(userId, mat.id);
      } catch (e) {
        console.error('[pre-generate] failed', e);
      }
    })();

    return NextResponse.json({ ok: true, materialId: mat.id });
  } catch (e) {
    await db
      .update(materials)
      .set({ status: 'failed', errorMsg: (e as Error).message })
      .where(eq(materials.id, mat.id));
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}