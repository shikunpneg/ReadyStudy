/**
 * Dashboard 统计数据聚合。
 */
import { db } from '@/lib/db';
import { attempts, questions, wrongQuestions, materials, userSettings } from '@/lib/db/schema';
import { eq, and, sql, gte } from 'drizzle-orm';

export async function getDashboardStats(userId: string) {
  // 1) 累计答题 / 正确率
  const [{ value: totalAttempts }] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(attempts)
    .where(eq(attempts.userId, userId));
  const [{ value: correctAttempts }] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.isCorrect, true)));
  const accuracy = totalAttempts ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

  // 2) 资料数
  const [{ value: totalMats }] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(materials)
    .where(eq(materials.userId, userId));

  // 3) 错题数
  const [{ value: wrongCount }] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(wrongQuestions)
    .where(eq(wrongQuestions.userId, userId));

  // 4) 最近 14 天答题曲线
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const recentRows = await db
    .select({
      day: sql<string>`to_char(${attempts.createdAt}, 'YYYY-MM-DD')`,
      total: sql<number>`count(*)::int`,
      correct: sql<number>`sum(case when ${attempts.isCorrect} then 1 else 0 end)::int`,
    })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), gte(attempts.createdAt, since)))
    .groupBy(sql`to_char(${attempts.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${attempts.createdAt}, 'YYYY-MM-DD')`);

  // 5) 知识点雷达图（按题型分布）
  const typeRows = await db
    .select({
      type: questions.type,
      cnt: sql<number>`count(*)::int`,
      correct: sql<number>`sum(case when ${attempts.isCorrect} then 1 else 0 end)::int`,
    })
    .from(attempts)
    .innerJoin(questions, eq(attempts.questionId, questions.id))
    .where(eq(attempts.userId, userId))
    .groupBy(questions.type);

  return {
    totalAttempts,
    correctAttempts,
    accuracy,
    totalMats,
    wrongCount,
    trend: recentRows,
    byType: typeRows,
  };
}