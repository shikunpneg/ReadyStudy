/**
 * 出题服务：检索上下文 → 构造 Prompt → 调用 LLM → 结构化入库。
 */
import { db } from '@/lib/db';
import { chunks, materials, questions, userSettings } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { chatCompletion, getDefaultModel, type LlmOptions } from '@/lib/ai/llm';
import { buildQuizPrompt, JUDGE_SUBJECTIVE_PROMPT } from '@/lib/ai/prompts';
import { decryptApiKey } from '@/lib/crypto';
import { retrieveTopK, putVector } from '@/lib/vector';
import { getEmbedder } from '@/lib/ai/embed';
import type { QuestionType } from '@/lib/db/schema';

export async function getUserLlmOpts(userId: string): Promise<LlmOptions> {
  const [s] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  if (!s?.encryptedApiKey) throw new Error('请先在设置页配置 API Key');
  return {
    provider: (s.llmProvider as 'deepseek' | 'openai') || 'deepseek',
    apiKey: decryptApiKey(s.encryptedApiKey),
    model: s.modelName || getDefaultModel('deepseek'),
  };
}

/**
 * 检索资料相关 chunks 作为上下文。
 * 优先向量检索，若 KV 不可用则降级到顺序取前 N 条。
 */
export async function buildContext(materialId: string, query: string): Promise<string> {
  // 1) 拿 embedder
  // 2) 计算 query 向量
  // 3) 检索 topK
  // 4) 拼接文本

  const [mat] = await db.select().from(materials).where(eq(materials.id, materialId));
  if (!mat) throw new Error('material not found');

  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, mat.userId));
  const apiKey = settings?.encryptedApiKey ? decryptApiKey(settings.encryptedApiKey) : undefined;

  let context = '';
  try {
    const embed = getEmbedder({
      provider: settings?.llmProvider ?? 'deepseek',
      apiKey,
      model: settings?.embedModelName ?? 'text-embedding-3-small',
    });
    const [qVec] = await embed.embed([query]);
    const items = await retrieveTopK(materialId, qVec, 6);
    if (items.length) {
      context = items.map((i) => i.content).join('\n\n---\n\n');
    }
  } catch {
    /* 降级 */
  }

  if (!context) {
    const allChunks = await db
      .select()
      .from(chunks)
      .where(eq(chunks.materialId, materialId));
    context = allChunks
      .sort((a, b) => a.chunkIndex - b.chunkIndex)
      .slice(0, 8)
      .map((c) => c.content)
      .join('\n\n---\n\n');
  }

  return context;
}

export interface GeneratedQuestion {
  type: QuestionType;
  difficulty: 'easy' | 'medium' | 'hard';
  content: string;
  options: Record<string, string> | null;
  answer: unknown;
  explanation: string;
}

export async function generateAndStoreQuestions(opts: {
  userId: string;
  materialId: string;
  type: QuestionType;
  count: number;
  difficulty: 'easy' | 'medium' | 'hard';
  isPreGenerated: boolean;
  topicHint?: string;
}) {
  const llm = await getUserLlmOpts(opts.userId);
  const query = opts.topicHint ?? '本资料核心知识点';
  const context = await buildContext(opts.materialId, query);

  const prompt = buildQuizPrompt({
    type: opts.type,
    context,
    count: opts.count,
    difficulty: opts.difficulty,
  });

  const text = await chatCompletion(
    llm,
    [
      {
        role: 'system',
        content: '你是一位严谨的中文出题老师。所有输出必须是合法 JSON，禁止任何解释或多余文本。',
      },
      { role: 'user', content: prompt },
    ],
    { json: true, temperature: 0.6 },
  );

  let parsed: { questions: GeneratedQuestion[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    // 兜底：尝试从 markdown 抽出 JSON
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('模型未返回合法 JSON');
    parsed = JSON.parse(m[0]);
  }

  if (!parsed.questions?.length) throw new Error('模型未生成题目');

  const rows = parsed.questions.map((q) => ({
    materialId: opts.materialId,
    userId: opts.userId,
    type: q.type,
    difficulty: q.difficulty,
    content: q.content,
    options: q.options as unknown,
    answer: q.answer as unknown,
    explanation: q.explanation,
    isPreGenerated: opts.isPreGenerated,
  }));
  const inserted = await db.insert(questions).values(rows).returning();
  return inserted;
}

/**
 * 评判一道主观题（简答/名词解释/论述）。
 */
export async function judgeSubjective(opts: {
  userId: string;
  questionId: string;
  studentAnswer: string;
}) {
  const [q] = await db.select().from(questions).where(eq(questions.id, opts.questionId));
  if (!q) throw new Error('question not found');
  const ans = q.answer as { keywords?: string[]; modelAnswer?: string };
  const llm = await getUserLlmOpts(opts.userId);
  const prompt = JUDGE_SUBJECTIVE_PROMPT.replace('{question}', q.content)
    .replace('{studentAnswer}', opts.studentAnswer)
    .replace('{modelAnswer}', ans.modelAnswer ?? '')
    .replace('{keywords}', (ans.keywords ?? []).join('、'));

  const text = await chatCompletion(
    llm,
    [{ role: 'user', content: prompt }],
    { json: true, temperature: 0.2 },
  );

  let j: { score: number; isCorrect: boolean; feedback: string };
  try {
    j = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    j = m ? JSON.parse(m[0]) : { score: 0, isCorrect: false, feedback: text };
  }
  return j;
}

/**
 * 评判客观题（单选/多选/判断/填空）。
 */
export function judgeObjective(q: {
  type: QuestionType;
  answer: unknown;
}, userAnswer: unknown): { isCorrect: boolean; score: number } {
  const normalize = (v: unknown) =>
    Array.isArray(v) ? v.map((x) => String(x).trim().toLowerCase()).sort() : [String(v).trim().toLowerCase()];
  const a = normalize(q.answer);
  const u = normalize(userAnswer);
  const same = a.length === u.length && a.every((x, i) => x === u[i]);
  return { isCorrect: same, score: same ? 100 : 0 };
}