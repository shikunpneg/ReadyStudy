/**
 * 笔记 API（划线 + 自由笔记）。
 *
 * POST /api/materials/[id]/notes      - 创建笔记
 * DELETE /api/materials/[id]/notes/[noteId] - 删除笔记
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/guards';
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const createSchema = z.object({
  kind: z.enum(['free', 'highlight', 'annotation']).default('free'),
  highlightText: z.string().max(2000).optional(),
  content: z.string().min(1).max(5000),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await ctx.params;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: '字段不合法' }, { status: 400 });
  }

  const [n] = await db
    .insert(notes)
    .values({
      userId: user.id,
      materialId: id,
      kind: parsed.data.kind,
      highlightText: parsed.data.highlightText ?? null,
      content: parsed.data.content,
    })
    .returning();

  revalidatePath(`/materials/${id}/read`);
  return NextResponse.json({
    id: n.id,
    kind: n.kind,
    highlightText: n.highlightText,
    content: n.content,
  });
}