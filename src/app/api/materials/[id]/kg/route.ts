/**
 * 知识图谱 API
 * POST /api/materials/[id]/kg  - 构建知识图谱（或重新构建）
 * GET  /api/materials/[id]/kg  - 获取已构建的知识图谱
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/guards';
import { db } from '@/lib/db';
import { materials, knowledgeGraphs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { buildKnowledgeGraph } from '@/lib/kg';
import { cleanText, splitChapters } from '@/lib/kg/text';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 60;

const buildSchema = z.object({
  force: z.boolean().optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await ctx.params;

  const [mat] = await db.select().from(materials).where(eq(materials.id, id));
  if (!mat || mat.userId !== user.id) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const [kg] = await db.select().from(knowledgeGraphs).where(eq(knowledgeGraphs.materialId, id));
  if (!kg) {
    return NextResponse.json({ error: '知识图谱尚未构建' }, { status: 404 });
  }
  return NextResponse.json({
    data: kg.data,
    stats: kg.stats,
    fullText: kg.fullText,
    updatedAt: kg.updatedAt,
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await ctx.params;

  const [mat] = await db.select().from(materials).where(eq(materials.id, id));
  if (!mat || mat.userId !== user.id) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  // 解析 body
  let force = false;
  try {
    const body = buildSchema.safeParse(await req.json());
    if (body.success) force = body.data.force ?? false;
  } catch {
    /* 无 body 也允许 */
  }

  // 已有图谱且不强制 → 直接返回
  if (!force) {
    const [existing] = await db.select().from(knowledgeGraphs).where(eq(knowledgeGraphs.materialId, id));
    if (existing) {
      return NextResponse.json({ data: existing.data, stats: existing.stats, cached: true });
    }
  }

  // 拿文本：优先用 chunks（已解析的），否则用 fileData 重新解析
  const { chunks } = await import('@/lib/db/schema');
  const chunkRows = await db.select().from(chunks).where(eq(chunks.materialId, id));
  let text = chunkRows
    .sort((a, b) => a.chunkIndex - b.chunkIndex)
    .map((c) => c.content)
    .join('\n\n');

  if (!text || text.trim().length < 50) {
    // fallback: 从 fileData 解析
    if (mat.fileData) {
      const buf = Buffer.from(mat.fileData, 'base64');
      const { parseDocument } = await import('@/lib/parsers');
      text = await parseDocument(buf, mat.type as never, mat.title);
    }
  }

  if (!text || text.trim().length < 50) {
    return NextResponse.json({ error: '无法获取文本，请先上传可解析的资料' }, { status: 400 });
  }

  // 构建知识图谱
  const { data, stats } = buildKnowledgeGraph(text, { bookTitle: mat.title });

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: '未提取到任何实体（可能文本结构较松散）' }, { status: 422 });
  }

  // 保存原文（按章节组织的 Markdown）
  const cleaned = cleanText(text);
  const chapters = splitChapters(cleaned);
  let fullTextMd = `# ${mat.title}\n\n`;
  if (Object.keys(chapters).length > 0) {
    for (const [chNum, chText] of Object.entries(chapters)) {
      fullTextMd += `\n## 第 ${chNum} 章\n\n${chText}\n\n`;
    }
  } else {
    fullTextMd += cleaned;
  }

  await db
    .insert(knowledgeGraphs)
    .values({
      materialId: id,
      data: data as never,
      stats: stats as never,
      fullText: fullTextMd,
    })
    .onConflictDoUpdate({
      target: knowledgeGraphs.materialId,
      set: {
        data: data as never,
        stats: stats as never,
        fullText: fullTextMd,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ data, stats, cached: false });
}