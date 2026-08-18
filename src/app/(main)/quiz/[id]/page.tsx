import { auth } from '@/lib/auth';
import { requireUser } from '@/lib/guards';
import { db } from '@/lib/db';
import { questions, materials } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { SingleQuiz } from './client';
import type { QuestionType } from '@/lib/db/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function SingleQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const userId = user.id;
  const { id } = await params;

  const [q] = await db.select().from(questions).where(eq(questions.id, id));
  if (!q || q.userId !== userId) notFound();

  const [mat] = await db.select().from(materials).where(eq(materials.id, q.materialId));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="text-sm text-muted-foreground">
        <Link href={`/materials/${q.materialId}/quiz`} className="hover:underline">
          ← 返回 {mat?.title ?? '资料'} 答题
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>
            {mat?.title} · 难度 {q.difficulty}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SingleQuiz
            question={{
              id: q.id,
              type: q.type as QuestionType,
              difficulty: q.difficulty,
              content: q.content,
              options: (q.options ?? null) as Record<string, string> | null,
              answer: q.answer,
              explanation: q.explanation,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}