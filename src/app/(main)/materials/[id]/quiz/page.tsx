import { auth } from '@/lib/auth';
import { requireUser } from '@/lib/guards';
import { db } from '@/lib/db';
import { materials, questions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { QuizClient } from './client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const userId = user.id;
  const { id } = await params;

  const [mat] = await db.select().from(materials).where(eq(materials.id, id));
  if (!mat || mat.userId !== userId) notFound();

  const list = await db
    .select()
    .from(questions)
    .where(and(eq(questions.materialId, id), eq(questions.userId, userId)));

  if (list.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold">{mat.title} · 出题</h1>
        <Card>
          <CardHeader>
            <CardTitle>还没有题目</CardTitle>
            <CardDescription>点下方按钮开始预生成核心题（50 道）。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href={`/materials/${id}/quiz/generate`}>
              <Button>预生成 50 道核心题</Button>
            </Link>
            <p className="text-xs text-muted-foreground">
              上传资料后通常需要 30-90 秒生成，请耐心等待。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{mat.title} · 答题</h1>
        <div className="flex gap-2">
          <Link href={`/materials/${id}/quiz/generate`}>
            <Button variant="outline">再来 5 道</Button>
          </Link>
        </div>
      </div>
      <QuizClient
        questions={list.map((q) => ({
          id: q.id,
          type: q.type,
          difficulty: q.difficulty,
          content: q.content,
          options: (q.options ?? null) as Record<string, string> | null,
          answer: q.answer,
          explanation: q.explanation,
        }))}
        materialId={id}
      />
    </div>
  );
}
