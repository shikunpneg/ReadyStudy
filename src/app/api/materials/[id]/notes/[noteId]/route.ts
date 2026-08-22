import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/guards';
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; noteId: string }> },
) {
  const user = await requireUser();
  const { id, noteId } = await ctx.params;

  const [del] = await db
    .delete(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)))
    .returning({ id: notes.id });

  if (!del) {
    return NextResponse.json({ error: '笔记不存在' }, { status: 404 });
  }
  revalidatePath(`/materials/${id}/read`);
  return NextResponse.json({ ok: true });
}