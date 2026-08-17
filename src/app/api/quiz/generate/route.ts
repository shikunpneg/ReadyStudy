import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateAndStoreQuestions } from '@/lib/quiz';
import type { QuestionType } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = (await req.json()) as {
    materialId: string;
    type: QuestionType;
    count: number;
    difficulty: 'easy' | 'medium' | 'hard';
    topicHint?: string;
  };

  if (!body.materialId || !body.type || !body.count) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 });
  }

  try {
    const rows = await generateAndStoreQuestions({
      userId,
      materialId: body.materialId,
      type: body.type,
      count: Math.min(Math.max(1, body.count), 10),
      difficulty: body.difficulty ?? 'medium',
      isPreGenerated: false,
      topicHint: body.topicHint,
    });
    return NextResponse.json({ ok: true, count: rows.length, questions: rows });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}