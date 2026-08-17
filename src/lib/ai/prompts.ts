/**
 * 题型 → Prompt 模板。
 * 所有 prompt 都要求模型返回 JSON，方便结构化落库。
 */
import type { QuestionType } from '@/lib/db/schema';

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  single: '单选题',
  multiple: '多选题',
  judge: '判断题',
  fill: '填空题',
  short: '简答题',
  define: '名词解释',
  essay: '论述题',
};

const BASE = `你是一位严谨的出题老师。基于【参考资料】出题，题目必须严格基于资料内容，禁止编造事实。

【参考资料】
{context}

【题型】{typeLabel}
【数量】{count}
【难度】{difficulty}（easy / medium / hard）
【返回格式】严格 JSON，结构如下：
{
  "questions": [
    {
      "type": "{type}",
      "difficulty": "{difficulty}",
      "content": "题目正文",
      "options": { "A":"...","B":"...","C":"...","D":"..." } 或 null,
      "answer": "..." | ["A","C"] | { "keywords":["关键词1","关键词2"], "modelAnswer":"参考答案" },
      "explanation": "答案解析，引用资料原文"
    }
  ]
}`;

const TYPE_HINT: Record<QuestionType, string> = {
  single: '选项 4 个（A-D），answer 为正确选项字母。',
  multiple: '选项 4-6 个，answer 为正确选项字母数组，至少 2 个。',
  judge: 'answer 为 "true" 或 "false"。可省略 options。',
  fill: 'content 中用 ___ 表示空，answer 为所填关键词字符串。',
  short: '2-4 行可答完，answer 用 {keywords, modelAnswer}。',
  define: '解释一个术语或概念，answer 用 {keywords, modelAnswer}。',
  essay: '需要展开论述，500 字以上，answer 用 {keywords, modelAnswer}。',
};

export function buildQuizPrompt(opts: {
  type: QuestionType;
  context: string;
  count: number;
  difficulty: 'easy' | 'medium' | 'hard';
}) {
  return [
    BASE.replace('{context}', opts.context)
      .replace('{type}', opts.type)
      .replace('{typeLabel}', QUESTION_TYPE_LABEL[opts.type])
      .replace('{count}', String(opts.count))
      .replace('{difficulty}', opts.difficulty),
    `【题型额外要求】${TYPE_HINT[opts.type]}`,
  ].join('\n\n');
}

/**
 * 评判主观题（简答 / 名词解释 / 论述）。
 */
export const JUDGE_SUBJECTIVE_PROMPT = `你是阅卷老师。给定【题目】、【学生作答】、【参考答案】与【关键词】，按 100 分制打分，并给出 1-3 句反馈。

返回 JSON：
{ "score": 0-100, "isCorrect": true|false, "feedback": "..." }

判定建议：
- 关键词覆盖 ≥80% 且论述与参考答案一致 → ≥80 分
- 关键词覆盖 50%-80% → 60-79 分
- 关键词覆盖 <50% → <60 分

【题目】{question}
【学生作答】{studentAnswer}
【参考答案】{modelAnswer}
【关键词】{keywords}`;