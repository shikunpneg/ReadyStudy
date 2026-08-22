import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { mindmaps } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateMindmap } from '@/lib/mindmap';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { materialId, forceLLM } = (await req.json()) as {
    materialId: string;
    forceLLM?: boolean;
  };
  if (!materialId) return NextResponse.json({ error: 'materialId required' }, { status: 400 });

  try {
    // 优先返回 DB 中已抽取的原生结构（PDF outline / EPUB spine / MD headers / HTML h1-h6）
    if (!forceLLM) {
      const [existing] = await db
        .select()
        .from(mindmaps)
        .where(and(eq(mindmaps.materialId, materialId), eq(mindmaps.structure as any, mindmaps.structure)));
      if (existing?.structure && Object.keys(existing.structure as object).length > 0) {
        return NextResponse.json({
          ok: true,
          structure: existing.structure,
          source: 'native',
        });
      }
    }

    // 没有原生结构 → 调 LLM 生成
    const structure = await generateMindmap(userId, materialId);
    return NextResponse.json({ ok: true, structure, source: 'llm' });
  } catch (e) {
    const err = e as Error;
    console.error('[api/mindmap] failed:', err.message, err.stack);
    return NextResponse.json({ error: err.message || '生成失败' }, { status: 500 });
  }
}