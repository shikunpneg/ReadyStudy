import { requireUser } from '@/lib/guards';
import { db } from '@/lib/db';
import { materials, questions, attempts } from '@/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { QUESTION_TYPE_LABEL } from '@/lib/ai/prompts';
import type { QuestionType } from '@/lib/db/schema';

export default async function QuizIndexPage() {
  const user = await requireUser();
  const userId = user.id;

  // 所有资料 + 各资料题数
  const rows = await db
    .select({
      materialId: questions.materialId,
      matTitle: materials.title,
      total: sql<number>`count(*)::int`,
    })
    .from(questions)
    .innerJoin(materials, eq(questions.materialId, materials.id))
    .where(eq(questions.userId, userId))
    .groupBy(questions.materialId, materials.title)
    .orderBy(desc(sql<number>`count(*)::int`));

  // 最近答题记录
  const recentAttempts = await db
    .select()
    .from(attempts)
    .where(eq(attempts.userId, userId))
    .orderBy(desc(attempts.createdAt))
    .limit(8);

  const [{ value: totalQ }] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(questions)
    .where(eq(questions.userId, userId));
  const [{ value: totalA }] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(attempts)
    .where(eq(attempts.userId, userId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">答题中心</h1>
        <p className="text-sm text-muted-foreground">
          基于你上传的资料出题。共 {totalQ} 道题，已答 {totalA} 次。
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-muted-foreground">还没有题目。请先上传资料并生成题。</p>
            <Link href="/upload">
              <Button>立即上传</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <Link key={r.materialId} href={`/materials/${r.materialId}/quiz`}>
              <Card className="h-full transition hover:border-primary">
                <CardHeader>
                  <CardTitle className="line-clamp-1 text-base">{r.matTitle}</CardTitle>
                  <CardDescription>共 {r.total} 道题</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-xs text-primary">开始答题 →</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {recentAttempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>最近答题</CardTitle>
            <CardDescription>最近 8 次答题记录</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {recentAttempts.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">
                    {formatDate(a.createdAt)} · {QUESTION_TYPE_LABEL[(a as { type?: QuestionType }).type as QuestionType] ?? '题目'}
                  </span>
                  <span className={a.isCorrect ? 'text-primary' : 'text-destructive'}>
                    {a.isCorrect ? '✓ 正确' : '✗ 错误'} · {a.score}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}