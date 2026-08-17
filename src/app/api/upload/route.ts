import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { materials } from '@/lib/db/schema';
import { parseDocument, detectType, chunkText } from '@/lib/parsers';
import { getEmbedder } from '@/lib/ai/embed';
import { putVector } from '@/lib/vector';
import { userSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const title = (form.get('title') as string) || file?.name;
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 });

  const type = detectType(file.name);
  if (!type) return NextResponse.json({ error: 'unsupported file type' }, { status: 400 });

  // 1. 上传到 Vercel Blob
  const blob = await put(`${userId}/${Date.now()}-${file.name}`, file, { access: 'public' });

  // 2. 落库
  const [mat] = await db
    .insert(materials)
    .values({
      userId,
      title: title || file.name,
      type,
      blobUrl: blob.url,
      sizeBytes: file.size,
      status: 'processing',
    })
    .returning();

  // 3. 异步处理：解析 + 切片 + 向量化
  // 注意：Vercel 函数会等待完成，所以直接跑
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const text = await parseDocument(buf, type);
    const chunks = chunkText(text);

    // 拿用户设置（BYOK）
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    const apiKey = settings?.encryptedApiKey
      ? (await import('@/lib/crypto')).decryptApiKey(settings.encryptedApiKey)
      : undefined;
    const embed = getEmbedder({
      provider: settings?.llmProvider ?? 'deepseek',
      apiKey,
      model: settings?.embedModelName ?? 'text-embedding-3-small',
    });

    // 批量 embedding（每次最多 32 条以免超额）
    for (let i = 0; i < chunks.length; i += 32) {
      const batch = chunks.slice(i, i + 32);
      const embeddings = await embed.embed(batch.map((c) => c.content));
      for (let j = 0; j < batch.length; j++) {
        const c = batch[j];
        await db
          .insert(/* chunks table */ (await import('@/lib/db/schema')).chunks)
          .values({
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
    return NextResponse.json({ ok: true, materialId: mat.id });
  } catch (e) {
    await db
      .update(materials)
      .set({ status: 'failed', errorMsg: (e as Error).message })
      .where(eq(materials.id, mat.id));
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}