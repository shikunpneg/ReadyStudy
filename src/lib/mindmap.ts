/**
 * 知识导图生成：让 LLM 返回树形 JSON。
 */
import { db } from '@/lib/db';
import { mindmaps } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { chatCompletion } from '@/lib/ai/llm';
import { getUserLlmOpts } from '@/lib/quiz';
import { buildContext } from '@/lib/quiz';

const PROMPT = `你是知识结构化专家。基于【参考资料】生成一棵思维导图，根节点为主题。

返回严格 JSON：
{
  "root": "主标题",
  "children": [
    {
      "title": "二级节点",
      "children": [
        { "title": "三级节点", "children": [] }
      ]
    }
  ]
}

要求：
- 二级节点不超过 7 个，三级节点每支不超过 6 个
- 内容必须完全基于【参考资料】，禁止编造
- 节点标题简洁（≤12 字）

【参考资料】
{context}`;

export async function generateMindmap(userId: string, materialId: string) {
  const llm = await getUserLlmOpts(userId);
  const context = await buildContext(materialId, '整体结构与主要章节');

  const text = await chatCompletion(
    llm,
    [{ role: 'user', content: PROMPT.replace('{context}', context) }],
    { json: true, temperature: 0.4 },
  );

  let structure: unknown;
  try {
    structure = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('LLM 未返回合法 JSON');
    structure = JSON.parse(m[0]);
  }

  // 落库（一个资料一份导图，简单覆盖式）
  const [exist] = await db
    .select()
    .from(mindmaps)
    .where(and(eq(mindmaps.materialId, materialId)));
  if (exist) {
    await db
      .update(mindmaps)
      .set({ structure: structure as never })
      .where(eq(mindmaps.id, exist.id));
  } else {
    await db.insert(mindmaps).values({ materialId, structure: structure as never });
  }

  return structure;
}