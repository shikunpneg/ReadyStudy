import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { attempts, questions, materials } from '@/lib/db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session!.user as { id: string }).id;

  const [{ value: totalAttempts }] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(attempts)
    .where(eq(attempts.userId, userId));

  const [{ value: correctAttempts }] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.isCorrect, true)));

  const [{ value: totalMats }] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(materials)
    .where(eq(materials.userId, userId));

  const accuracy = totalAttempts ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
  const recent = await db
    .select()
    .from(attempts)
    .where(eq(attempts.userId, userId))
    .orderBy(desc(attempts.createdAt))
    .limit(10);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">学习看板</h1>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="累计答题" value={totalAttempts} />
        <StatCard label="正确率" value={`${accuracy}%`} />
        <StatCard label="已上传资料" value={totalMats} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最近答题</CardTitle>
          <CardDescription>展示最近 10 条答题记录（详细图表在后续版本接入）</CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">还没有答题记录</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recent.map((a) => (
                <li key={a.id} className="flex items-center justify-between border-b py-2 last:border-0">
                  <span className="truncate">{a.questionId.slice(0, 8)}…</span>
                  <span className={a.isCorrect ? 'text-primary' : 'text-destructive'}>
                    {a.isCorrect ? '✓ 正确' : '✗ 错误'} · {a.score}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}