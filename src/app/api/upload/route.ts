import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { materials, chunks, userSettings } from '@/lib/db/schema';
import { parseDocument, detectType, chunkText } from '@/lib/parsers';
import { compressPdf } from '@/lib/pdf-compress';
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

  // Content-Length 头提前校验（Vercel 平台本身的 413 在 formData() 之前抛出）
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

  const type = detectType(file.name);
  if (!type) {
    return NextResponse.json(
      {
        error: `不支持的文件类型。已支持：PDF / TXT / Markdown / PPTX / DOCX / EPUB / MOBI / AZW3`,
      },
      { status: 400 },
    );
  }

  // 1. PDF 自动服务端压缩（解决 4MB 限制）
  let fileBytes = Buffer.from(await file.arrayBuffer());
  const originalSize = fileBytes.length;
  let compressed = false;
  if (type === 'pdf' && fileBytes.length > MAX_FILE_BYTES) {
    try {
      const compressedBytes = await compressPdf(fileBytes);
      if (compressedBytes.length < fileBytes.length) {
        fileBytes = Buffer.from(compressedBytes);
        compressed = true;
        console.log(
          `[upload] PDF compressed: ${(originalSize / 1024 / 1024).toFixed(1)}MB -> ${(fileBytes.length / 1024 / 1024).toFixed(1)}MB`,
        );
      }
    } catch (e) {
      console.warn('[upload] PDF compression failed:', (e as Error).message);
    }
  }

  // 压缩后仍超限才报错
  if (fileBytes.length > MAX_FILE_BYTES) {
    return NextResponse.json(
      {
        error: `文件 ${Math.round(fileBytes.length / 1024 / 1024)}MB 超过 4MB 限制${compressed ? '（已尝试服务端压缩，仍超限）' : ''}。建议：① 移除 PDF 中的大图片后重新导出；② 用 ilovepdf.com 压缩；③ 改为上传 TXT/Markdown。`,
      },
      { status: 413 },
    );
  }

  // 2. 落库
  const [mat] = await db
    .insert(materials)
    .values({
      userId,
      title: title || file.name,
      type,
      blobUrl: '',
      sizeBytes: originalSize, // 记录原始大小
      status: 'processing',
    })
    .returning();

  // 3. 解析 + 切片 + 向量化
  try {
    const text = await parseDocument(fileBytes, type);
    const chunkList = chunkText(text);

    if (chunkList.length === 0) {
      throw new Error('文档解析为空，可能是不支持的格式或加密文档');
    }

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

    // 批量 embedding
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

    // 4) 触发预生成 50 道核心题
    (async () => {
      try {
        const { preGenerateCoreQuestions } = await import('@/lib/jobs');
        await preGenerateCoreQuestions(userId, mat.id);
      } catch (e) {
        console.error('[pre-generate] failed', e);
      }
    })();

    return NextResponse.json({
      ok: true,
      materialId: mat.id,
      compressed,
      originalSizeMB: +(originalSize / 1024 / 1024).toFixed(2),
      finalSizeMB: +(fileBytes.length / 1024 / 1024).toFixed(2),
      chunkCount: chunkList.length,
    });
  } catch (e) {
    await db
      .update(materials)
      .set({ status: 'failed', errorMsg: (e as Error).message })
      .where(eq(materials.id, mat.id));
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}