/**
 * 上传完成后异步预生成 50 道核心题（混合策略）。
 * 分布在多种题型上。
 */
import { db } from '@/lib/db';
import { materials } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateAndStoreQuestions } from '@/lib/quiz';
import type { QuestionType } from '@/lib/db/schema';

const MIX: { type: QuestionType; count: number; difficulty: 'easy' | 'medium' | 'hard' }[] = [
  { type: 'single', count: 10, difficulty: 'easy' },
  { type: 'single', count: 10, difficulty: 'medium' },
  { type: 'multiple', count: 6, difficulty: 'medium' },
  { type: 'judge', count: 8, difficulty: 'easy' },
  { type: 'fill', count: 8, difficulty: 'medium' },
  { type: 'short', count: 4, difficulty: 'hard' },
  { type: 'define', count: 4, difficulty: 'medium' },
];

export async function preGenerateCoreQuestions(userId: string, materialId: string) {
  const [mat] = await db.select().from(materials).where(eq(materials.id, materialId));
  if (!mat) return;

  for (const m of MIX) {
    try {
      await generateAndStoreQuestions({
        userId,
        materialId,
        type: m.type,
        count: m.count,
        difficulty: m.difficulty,
        isPreGenerated: true,
      });
    } catch (e) {
      // 单类型失败不影响其他类型
      console.error(`[preGenerate] ${m.type} failed:`, e);
    }
  }
}