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

// Vercel Hobby plan API route body 上限 4.5MB
const MAX_FILE_BYTES = 4 * 1024 * 1024;

// 单次最多 chunks（防 OOM）
const MAX_CHUNKS_PER_MATERIAL = 200;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = (session.user as { id: string }).id;

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
      { error: `上传失败：${(e as Error).message}（通常是文件超过 4MB 限制）` },
      { status: 413 },
    );
  }

  const file = form.get('file') as File | null;
  const title = (form.get('title') as string) || file?.name;
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 });

  const type = detectType(file.name);
  if (!type) {
    return NextResponse.json(
      { error: '不支持的文件类型。已支持：PDF / TXT / Markdown / HTML / PPTX / DOCX / EPUB / MOBI / AZW3' },
      { status: 400 },
    );
  }

  // 1. PDF 服务端压缩
  let fileBytes = Buffer.from(await file.arrayBuffer());
  const originalSize = fileBytes.length;
  let compressed = false;
  if (type === 'pdf' && fileBytes.length > MAX_FILE_BYTES) {
    try {
      const compressedBytes = await compressPdf(fileBytes);
      if (compressedBytes.length < fileBytes.length) {
        fileBytes = Buffer.from(compressedBytes);
        compressed = true;
      }
    } catch (e) {
      console.warn('[upload] PDF compression failed:', (e as Error).message);
    }
  }

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
      sizeBytes: originalSize,
      status: 'processing',
    })
    .returning();

  // 3. 解析 + 切片 + 向量化（try 外层，错误时只回退状态）
  try {
    const text = await parseDocument(fileBytes, type, file.name);
    const chunkList = chunkText(text, 500, 80);

    if (chunkList.length === 0) {
      throw new Error('文档解析为空，可能是不支持的格式或加密文档');
    }

    // 限制最大 chunk 数
    const finalChunks = chunkList.slice(0, MAX_CHUNKS_PER_MATERIAL);
    const truncated = chunkList.length > MAX_CHUNKS_PER_MATERIAL;

    // 拿用户设置
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

    // 4. 批量 embedding（小批量 16，避免大 batch OOM）
    const EMBED_BATCH = 16;
    const allEmbeddings: number[][] = [];
    for (let i = 0; i < finalChunks.length; i += EMBED_BATCH) {
      const batch = finalChunks.slice(i, i + EMBED_BATCH);
      try {
        const embeddings = await embed.embed(batch.map((c) => c.content));
        allEmbeddings.push(...embeddings);
      } catch (e) {
        console.warn(`[upload] embed batch ${i} failed:`, (e as Error).message);
        // 用零向量占位，确保 DB 记录完整
        const dim = 1536;
        allEmbeddings.push(...batch.map(() => new Array(dim).fill(0)));
      }
    }

    // 5. 批量 insert（单条 SQL，减少连接数和内存峰值）
    const chunkRows = finalChunks.map((c, i) => ({
      materialId: mat.id,
      chunkIndex: c.index,
      content: c.content,
      tokenCount: c.tokenCount,
      kvKey: `vec:${mat.id}:${c.index}`,
    }));
    // Drizzle pg insert 一次最多 ~1000 条，分批
    for (let i = 0; i < chunkRows.length; i += 100) {
      await db.insert(chunks).values(chunkRows.slice(i, i + 100));
    }

    // 6. 向量写 KV（fire-and-forget；失败不影响主流程）
    (async () => {
      try {
        for (let i = 0; i < finalChunks.length; i++) {
          await putVector(mat.id, finalChunks[i].index, {
            embedding: allEmbeddings[i] ?? new Array(1536).fill(0),
            content: finalChunks[i].content,
          });
        }
      } catch (e) {
        console.warn('[upload] putVector failed:', (e as Error).message);
      }
    })();

    await db.update(materials).set({ status: 'ready' }).where(eq(materials.id, mat.id));

    // 7. pre-generate 完全异步，不阻塞响应
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
      truncated,
      originalSizeMB: +(originalSize / 1024 / 1024).toFixed(2),
      finalSizeMB: +(fileBytes.length / 1024 / 1024).toFixed(2),
      chunkCount: finalChunks.length,
    });
  } catch (e) {
    const err = e as Error;
    await db
      .update(materials)
      .set({ status: 'failed', errorMsg: err.message })
      .where(eq(materials.id, mat.id));
    console.error('[upload] failed:', err.message, err.stack);
    return NextResponse.json({ error: err.message || '上传失败' }, { status: 500 });
  }
}