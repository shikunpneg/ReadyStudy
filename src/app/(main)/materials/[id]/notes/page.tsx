import { requireUser } from '@/lib/guards';
import { db } from '@/lib/db';
import { materials, notes } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackLink } from '@/components/breadcrumb';

export default async function NotesPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const userId = user.id;
  const { id } = await params;

  const [mat] = await db.select().from(materials).where(eq(materials.id, id));
  if (!mat || mat.userId !== userId) notFound();

  const list = await db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.materialId, id)))
    .orderBy(desc(notes.createdAt));

  return (
    <div className="space-y-4">
      <BackLink href={`/materials/${id}`} label="返回资料详情" />
      <h1 className="text-2xl font-semibold">{mat.title} · 笔记</h1>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          还没有笔记。前往 <a href={`/materials/${id}/read`} className="text-primary underline">阅读模式</a> 添加。
        </p>
      ) : (
        <div className="space-y-2">
          {list.map((n) => (
            <Card key={n.id}>
              <CardHeader>
                <CardTitle className="text-sm">{new Date(n.createdAt).toLocaleString('zh-CN')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{n.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}