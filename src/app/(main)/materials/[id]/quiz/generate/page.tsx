import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { materials } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { GenerateForm } from './form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default async function GeneratePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session!.user as { id: string }).id;
  const { id } = await params;
  const [mat] = await db.select().from(materials).where(eq(materials.id, id));
  if (!mat || mat.userId !== userId) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">{mat.title} · 出题</h1>
      <Card>
        <CardHeader>
          <CardTitle>生成新题</CardTitle>
          <CardDescription>实时调用 LLM 生成新题目，每次 1-10 道。</CardDescription>
        </CardHeader>
        <CardContent>
          <GenerateForm materialId={id} />
        </CardContent>
      </Card>
    </div>
  );
}