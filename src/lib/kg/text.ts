/**
 * 文本清洗 + 章节分割 + 标题提取
 * 移植自 fast_read_book kg_core/text_cleaner.py
 */

/** 清洗文本：合并断行、去除页码/页眉噪声 */
export function cleanText(text: string): string {
  const lines = text.split('\n');
  const cleaned: string[] = [];

  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped) {
      cleaned.push('');
      continue;
    }
    // 跳过纯页码
    if (/^\d{1,4}$/.test(stripped)) continue;
    // 章标题单独成段
    if (/^第[一二三四五六七八九十\d]+章/.test(stripped)) {
      cleaned.push(stripped);
      cleaned.push('');
      continue;
    }
    // 合并断行：上一行不以标点结尾且当前行不是新结构
    const last = cleaned[cleaned.length - 1];
    if (last && last.length > 0 && !/[。！？；：）)」』"』]$/.test(last)) {
      if (!/^(\d+\.|第|图\d|表\d|[A-Z][a-z])/.test(stripped)) {
        cleaned[cleaned.length - 1] = last + stripped;
        continue;
      }
    }
    cleaned.push(stripped);
  }

  return cleaned.join('\n').replace(/\n{3,}/g, '\n\n');
}

/** 按"第X章"分割文本，返回 {章号: 文本} */
export function splitChapters(text: string): Record<number, string> {
  const lines = text.split('\n');
  const chapters: Record<number, string> = {};
  let currentCh: number | null = null;
  const chapterLines: string[] = [];
  const CH_PAT = /^第([一二三四五六七八九十\d]+)章/;

  for (const rawLine of lines) {
    const line = rawLine.replace(/^\uFEFF/, '').trim();
    const m = CH_PAT.exec(line);
    if (m) {
      const cn = chineseToNumber(m[1]);
      if (cn !== null) {
        if (currentCh !== null) {
          chapters[currentCh] = chapterLines.join('\n');
        }
        currentCh = cn;
        chapterLines.length = 0;
        chapterLines.push(line);
        continue;
      }
    }
    if (currentCh !== null) chapterLines.push(line);
  }
  if (currentCh !== null) chapters[currentCh] = chapterLines.join('\n');
  return chapters;
}

export function chineseToNumber(s: string): number | null {
  const map: Record<string, number> = {
    一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
  };
  if (map[s] !== undefined) return map[s];
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

/** 提取章节标题：`\d+(\.\d+)+ 标题` 模式，返回 {标题: 章号} */
export function extractChapterTitles(text: string, chapters: Record<number, string>): Record<string, number> {
  const titlePattern = /^(\d+(?:\.\d+)+)\s+(.+)$/;
  const sectionTitles: Record<string, number> = {};
  const chNums = new Set(Object.keys(chapters).map(Number));

  for (const line of text.split('\n')) {
    const stripped = line.trim();
    const m = titlePattern.exec(stripped);
    if (m) {
      const titleText = m[2].trim();
      if (titleText.includes('本章小结')) continue;
      const topLevel = parseInt(m[1].split('.')[0], 10);
      if (chNums.has(topLevel)) {
        sectionTitles[titleText] = topLevel;
      }
    }
  }
  return sectionTitles;
}

/** 按句子切分（中文标点） */
export function splitSentences(text: string): string[] {
  const sents = text.split(/(?<=[。！？；\n])\s*/);
  return sents.map((s) => s.trim()).filter((s) => s.length > 5);
}
