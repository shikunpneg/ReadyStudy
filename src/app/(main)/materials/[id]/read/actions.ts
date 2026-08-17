'use server';

import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

const saveSchema = z.object({
  materialId: z.string().min(1),
  chunkId: z.string().min(1),
  content: z.string().min(1).max(5000),
});

const delSchema = z.object({ noteId: z.string().min(1) });

export async function saveNoteAction(input: { materialId: string; chunkId: string; content: string }) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: '未登录' };
  const userId = (session.user as { id: string }).id;

  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: '字段不合法' };

  const [n] = await db
    .insert(notes)
    .values({ userId, materialId: parsed.data.materialId, chunkId: parsed.data.chunkId, content: parsed.data.content })
    .returning({ id: notes.id });

  revalidatePath(`/materials/${parsed.data.materialId}/read`);
  return { ok: true as const, noteId: n.id };
}

export async function deleteNoteAction(input: { noteId: string }) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: '未登录' };
  const userId = (session.user as { id: string }).id;

  const parsed = delSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: '字段不合法' };

  await db.delete(notes).where(and(eq(notes.id, parsed.data.noteId), eq(notes.userId, userId)));
  return { ok: true as const };
}