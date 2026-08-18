import { auth } from '@/lib/auth';
import { requireUser } from '@/lib/guards';
import { db } from '@/lib/db';
import { materials, mindmaps, chunks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { MindmapClient } from './client';

interface TreeNode {
  title: string;
  children?: TreeNode[];
}

export default async function MindmapPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const userId = user.id;
  const { id } = await params;

  const [mat] = await db.select().from(materials).where(eq(materials.id, id));
  if (!mat || mat.userId !== userId) notFound();

  const [m] = await db.select().from(mindmaps).where(eq(mindmaps.materialId, id));
  const totalChunks = await db.select().from(chunks).where(eq(chunks.materialId, id));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{mat.title} · 知识导图</h1>
      <MindmapClient
        materialId={id}
        initial={(m?.structure as unknown as { root: string; children: TreeNode[] }) ?? null}
        chunkCount={totalChunks.length}
      />
    </div>
  );
}