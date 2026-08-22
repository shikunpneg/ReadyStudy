import { requireUser } from '@/lib/guards';
import { db } from '@/lib/db';
import { materials, notes } from '@/lib/db/schema';
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

  const myNotes = await db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.materialId, id)));

  const hasOriginal = Boolean(mat.fileData);

  return (
    <div className="space-y-4">
      <BackLink href={`/materials/${id}`} label="返回资料详情" />
      <h1 className="text-2xl font-semibold">{mat.title} · 阅读</h1>
      <ReaderClient
        materialId={id}
        type={mat.type as 'pdf' | 'html' | 'md' | 'txt' | 'epub' | 'mobi' | 'pptx' | 'docx'}
        title={mat.title}
        hasOriginal={hasOriginal}
        notes={myNotes.map((n) => ({
          id: n.id,
          highlightText: n.highlightText,
          content: n.content,
          kind: n.kind,
          createdAt: n.createdAt.toISOString(),
        }))}
        // 用于 PDF/EPUB/HTML 等的纯文本回退（早期上传无 fileData）
        fallbackChunks={
          hasOriginal
            ? []
            : (
                await db
                  .select()
                  .from((await import('@/lib/db/schema')).chunks)
                  .where(eq((await import('@/lib/db/schema')).chunks.materialId, id))
              ).map((c) => ({ id: c.id, content: c.content }))
        }
      />
    </div>
  );
}