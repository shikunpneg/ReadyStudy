import { requireUser } from '@/lib/guards';
import { db } from '@/lib/db';
import { materials, knowledgeGraphs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { BackLink } from '@/components/breadcrumb';
import { MindmapClient } from './client';
import type { KGData, KGStats } from '@/lib/kg/types';

export default async function MindmapPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const userId = user.id;
  const { id } = await params;

  const [mat] = await db.select().from(materials).where(eq(materials.id, id));
  if (!mat || mat.userId !== userId) notFound();

  const [kg] = await db.select().from(knowledgeGraphs).where(eq(knowledgeGraphs.materialId, id));

  return (
    <div className="space-y-4">
      <BackLink href={`/materials/${id}`} label="返回资料详情" />
      <h1 className="text-2xl font-semibold">{mat.title} · 知识图谱</h1>
      <MindmapClient
        materialId={id}
        materialTitle={mat.title}
        initialData={(kg?.data as unknown as KGData) ?? null}
        initialStats={(kg?.stats as unknown as KGStats) ?? null}
        initialFullText={(kg?.fullText as string) ?? null}
      />
    </div>
  );
}