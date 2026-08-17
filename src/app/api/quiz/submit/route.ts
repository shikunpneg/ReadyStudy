import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { questions, attempts, wrongQuestions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { judgeObjective, judgeSubjective } from '@/lib/quiz';
import type { QuestionType } from '@/lib/db/schema';

export const runtime = 'nodejs';

const SUBJECTIVE: QuestionType[] = ['short', 'define', 'essay'];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { questionId, userAnswer } = (await req.json()) as {
    questionId: string;
    userAnswer: unknown;
  };

  const [q] = await db.select().from(questions).where(eq(questions.id, questionId));
  if (!q) return NextResponse.json({ error: 'question not found' }, { status: 404 });

  let result: { isCorrect: boolean; score: number; feedback?: string };

  if (SUBJECTIVE.includes(q.type as QuestionType)) {
    result = await judgeSubjective({
      userId,
      questionId,
      studentAnswer: String(userAnswer ?? ''),
    });
  } else {
    result = judgeObjective({ type: q.type as QuestionType, answer: q.answer }, userAnswer);
  }

  // 落库
  const [att] = await db
    .insert(attempts)
    .values({
      userId,
      questionId,
      userAnswer: userAnswer as unknown,
      isCorrect: result.isCorrect,
      score: result.score,
      feedback: result.feedback,
    })
    .returning();

  if (!result.isCorrect) {
    const [exist] = await db
      .select()
      .from(wrongQuestions)
      .where(and(eq(wrongQuestions.userId, userId), eq(wrongQuestions.questionId, questionId)));
    if (exist) {
      await db
        .update(wrongQuestions)
        .set({ wrongCount: exist.wrongCount + 1, lastWrongAt: new Date() })
        .where(and(eq(wrongQuestions.userId, userId), eq(wrongQuestions.questionId, questionId)));
    } else {
      await db.insert(wrongQuestions).values({ userId, questionId });
    }
  }

  return NextResponse.json({ ok: true, attempt: att, ...result });
}