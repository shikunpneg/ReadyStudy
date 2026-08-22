/**
 * 知识图谱构建器（主流程）
 * 移植自 fast_read_book kg_core/builder.py KnowledgeGraphBuilder
 *
 * 流程：清洗 → 章节分割 → 提取标题 → 提取参考文献 → 定义/段落 → 关系
 */
import type { KGData, KGEntity, KGStats } from './types';
import { cleanText, splitChapters, extractChapterTitles, chineseToNumber } from './text';
import { extractDefinition, extractParagraph, titleToEntity } from './definitions';
import { buildRelations } from './relations';

// 安全上限：避免 O(n²) 关系构建太慢 / OOM
const MAX_ENTITIES = 400;
const MAX_REFERENCES = 200;

export interface BuildOptions {
  bookTitle?: string;
  maxEntities?: number;
}

/**
 * 构建知识图谱。输入全文文本，输出实体数据（与 fast_read_book 格式一致）。
 */
export function buildKnowledgeGraph(text: string, opts: BuildOptions = {}): { data: KGData; stats: KGStats } {
  const maxEntities = opts.maxEntities ?? MAX_ENTITIES;

  // 1. 清洗 + 分割章节
  const cleaned = cleanText(text);
  const chapters = splitChapters(cleaned);
  const data: KGData = {};
  const existing = new Set<string>();

  // 2. 章节标题 → 实体
  const sectionTitles = extractChapterTitles(cleaned, chapters);
  let newEntities = 0;
  for (const [titleText, chNum] of Object.entries(sectionTitles)) {
    if (newEntities >= maxEntities) break;
    const entityName = titleToEntity(titleText);
    if (existing.has(entityName)) continue;
    data[entityName] = {
      name: entityName,
      ch_num: chNum,
      weight: 0.5,
      definition: '',
      paragraph: '',
      summary: '',
      is_section_title: true,
      related_entities: [],
    };
    existing.add(entityName);
    newEntities++;
  }

  // 3. 参考文献条目 → 实体
  const refCount = extractReferences(cleaned, chapters, data, existing, maxEntities - newEntities);
  newEntities += refCount;

  // 4. 定义 + 段落
  for (const [name, info] of Object.entries(data)) {
    const chNum = info.ch_num || 1;
    const chText = chapters[chNum] || cleaned;

    const newDef = extractDefinition(chText, name);
    const newPara = extractParagraph(chText, name);

    if (newDef && newDef.length > 20) {
      if (!info.definition || info.definition === '(暂无定义)' || newDef.length > info.definition.length * 0.5) {
        data[name].definition = newDef;
      }
    }
    if (newPara && newPara.length > 30) {
      if (!info.paragraph || info.paragraph === '(暂无段落)' || newPara.length > info.paragraph.length) {
        data[name].paragraph = newPara;
      }
    }
  }

  // 5. 关系
  let newRelations = 0;
  if (Object.keys(data).length > 1) {
    newRelations = buildRelations(data);
  }

  const totalRelations = Object.values(data).reduce((acc, e) => acc + e.related_entities.length, 0);
  const withDef = Object.values(data).filter((e) => e.definition && e.definition !== '(暂无定义)').length;
  const withPara = Object.values(data).filter((e) => e.paragraph && e.paragraph !== '(暂无段落)').length;

  const stats: KGStats = {
    total_entities: Object.keys(data).length,
    total_relations: totalRelations,
    with_definition: withDef,
    with_paragraph: withPara,
    new_entities: newEntities,
    new_relations: newRelations,
  };

  return { data, stats };
}

/** 提取参考文献条目（"参考文献"小节后的 [1] xxx 行） */
function extractReferences(
  text: string,
  chapters: Record<number, string>,
  data: KGData,
  existing: Set<string>,
  budget: number,
): number {
  const lines = text.split('\n');
  let refIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].trim();
    if (/参考文献|References|Bibliography|引文|引用文献/.test(stripped)) {
      if (stripped.length < 30) {
        refIdx = i;
        break;
      }
    }
  }
  if (refIdx < 0) return 0;

  let added = 0;
  let i = refIdx + 1;
  const currentCh = findChapterAt(lines, refIdx);
  let n = 0;

  while (i < lines.length && added < budget) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    if (/^(第[一二三四五六七八九十\d]+章|#{1,4} )/.test(line)) break;

    const m = /^\[?(\d+)\]?[\.\s]+(.+)$/.exec(line);
    if (m && line.length > 30) {
      const refContent = m[2].trim();
      const firstAuthor = refContent.split(',')[0].split('.')[0].trim();
      const entityName = firstAuthor.length >= 2 ? `[${m[1]}] ${firstAuthor}` : `[${m[1]}] ${refContent.slice(0, 40)}`;
      if (!existing.has(entityName)) {
        n++;
        if (n > MAX_REFERENCES) break;
        data[entityName] = {
          name: entityName,
          ch_num: currentCh,
          weight: 0.3,
          definition: refContent.slice(0, 200),
          paragraph: refContent,
          summary: '',
          is_section_title: false,
          is_reference: true,
          related_entities: [],
        };
        existing.add(entityName);
        added++;
      }
    }
    i++;
  }
  return added;
}

function findChapterAt(lines: string[], idx: number): number {
  for (let i = idx; i >= 0; i--) {
    const m = /^第([一二三四五六七八九十\d]+)章/.exec(lines[i].trim());
    if (m) {
      const cn = chineseToNumber(m[1]);
      if (cn !== null) return cn;
    }
  }
  return 1;
}
