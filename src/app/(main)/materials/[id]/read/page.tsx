import { requireUser } from '@/lib/guards';
import { db } from '@/lib/db';
import { materials, chunks, notes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { BackLink } from '@/components/breadcrumb';
import { ReaderClient } from './client';

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const userId = user.id;
  const { id } = await params;

  const [mat] = await db.select().from(materials).where(eq(materials.id, id));
  if (!mat || mat.userId !== userId) notFound();

  const list = await db
    .select()
    .from(chunks)
    .where(eq(chunks.materialId, id));
  const sorted = list.sort((a, b) => a.chunkIndex - b.chunkIndex);

  const myNotes = await db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.materialId, id)));

  return (
    <div className="space-y-4">
      <BackLink href={`/materials/${id}`} label="返回资料详情" />
      <h1 className="text-2xl font-semibold">{mat.title} · 阅读</h1>
      <ReaderClient
        materialId={id}
        chunks={sorted.map((c) => ({ id: c.id, index: c.chunkIndex, content: c.content }))}
        notes={myNotes.map((n) => ({
          id: n.id,
          chunkId: n.chunkId,
          content: n.content,
        }))}
      />
    </div>
  );
}