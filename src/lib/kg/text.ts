/**
 * 文本清洗 + 章节分割 + 标题提取
 * 移植自 fast_read_book kg_core/text_cleaner.py，并增强：
 *  - 支持中文数字章节（一、二、三）
 *  - 支持英文 Chapter N / Section N
 *  - 支持 Markdown # 标题
 *  - HTML 实体解码
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
    // 章节标题单独成段（第X章 / Chapter / 中文数字 / 数字 / Markdown 标题）
    if (
      /^(第[一二三四五六七八九十\d]+章|Chapter\s+\d+|CHAPTER\s+\d+)/i.test(stripped) ||
      /^[一二三四五六七八九十]+[、.．]\s*\S/.test(stripped) ||
      /^\d{1,3}[.、．]\s*\S/.test(stripped) ||
      /^#{1,6}\s+\S/.test(stripped)
    ) {
      cleaned.push(stripped);
      cleaned.push('');
      continue;
    }
    // 合并断行：上一行不以标点结尾且当前行不是新结构
    const last = cleaned[cleaned.length - 1];
    if (last && last.length > 0 && !/[。！？；：）)」』"』]$/.test(last)) {
      if (!/^(\d+\.|第|图\d|表\d|[A-Z][a-z]|#|Chapter)/.test(stripped)) {
        cleaned[cleaned.length - 1] = last + stripped;
        continue;
      }
    }
    cleaned.push(stripped);
  }

  return cleaned.join('\n').replace(/\n{3,}/g, '\n\n');
}

/** 解码常见 HTML 实体（EPUB/HTML 提取残留） */
export function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/** 按章节分割文本，返回 {章号: 文本}。支持 第X章 / Chapter N */
export function splitChapters(text: string): Record<number, string> {
  const lines = text.split('\n');
  const chapters: Record<number, string> = {};
  let currentCh: number | null = null;
  const chapterLines: string[] = [];
  const CH_PAT = /^(第([一二三四五六七八九十\d]+)章|Chapter\s+(\d+)|CHAPTER\s+(\d+))/i;

  for (const rawLine of lines) {
    const line = rawLine.replace(/^\uFEFF/, '').trim();
    const m = CH_PAT.exec(line);
    if (m) {
      const cn = m[2] ? chineseToNumber(m[2]) : m[3] ? parseInt(m[3], 10) : m[4] ? parseInt(m[4], 10) : null;
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
    十一: 11, 十二: 12, 十三: 13, 十四: 14, 十五: 15, 十六: 16, 十七: 17, 十八: 18, 十九: 19, 二十: 20,
  };
  if (map[s] !== undefined) return map[s];
  // 二十X
  const m = /^二十([一二三四五六七八九])$/.exec(s);
  if (m) return 20 + (map[m[1]] ?? 0);
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

export interface TitleHit {
  title: string;
  chNum: number;
  depth: number; // 0=章, 1=节, 2=小节
}

/**
 * 提取章节标题（增强版）。
 * 支持模式：
 *   第X章 / Chapter N
 *   N.N.N 标题
 *   N. 标题  /  N 标题
 *   一、标题 / 二、标题（中文数字）
 *   # 标题 / ## 标题（Markdown）
 * 返回按出现顺序排列的标题列表。
 */
export function extractChapterTitles(text: string, chapters: Record<number, string>): TitleHit[] {
  const chNums = new Set(Object.keys(chapters).map(Number));
  const hits: TitleHit[] = [];
  let autoCh = 1;

  const patterns: { re: RegExp; depth: number; getCh: (m: RegExpExecArray) => number | null }[] = [
    // 第X章 标题
    {
      re: /^(第([一二三四五六七八九十\d]+)章)\s*(.+)$/,
      depth: 0,
      getCh: (m) => chineseToNumber(m[2]),
    },
    // Chapter N: 标题
    {
      re: /^Chapter\s+(\d+)[:：.\s]+(.+)$/i,
      depth: 0,
      getCh: (m) => parseInt(m[1], 10),
    },
    // N.N.N 标题
    {
      re: /^(\d+(?:\.\d+)+)\s+(.+)$/,
      depth: 1,
      getCh: (m) => {
        const top = parseInt(m[1].split('.')[0], 10);
        return chNums.has(top) ? top : null;
      },
    },
    // N. 标题（章级，只有无第X章结构时用）
    {
      re: /^(\d{1,2})[.、．]\s*(.+)$/,
      depth: 1,
      getCh: (m) => {
        const n = parseInt(m[1], 10);
        return chNums.has(n) ? n : n; // 无条件接受，作为章节号
      },
    },
    // 一、标题（中文数字）
    {
      re: /^([一二三四五六七八九十]+)[、.．]\s*(.+)$/,
      depth: 1,
      getCh: (m) => chineseToNumber(m[1]),
    },
    // Markdown # 标题
    {
      re: /^(#{1,6})\s+(.+)$/,
      depth: 1,
      getCh: () => null, // 用自动章节号
    },
  ];

  for (const line of text.split('\n')) {
    const stripped = line.trim();
    if (!stripped) continue;
    if (stripped.includes('本章小结')) continue;

    for (const p of patterns) {
      const m = p.re.exec(stripped);
      if (!m) continue;
      // 提取标题文本（去掉编号前缀）
      let title = '';
      let chNum: number | null = null;
      if (p.re.source.startsWith('^(第')) {
        title = (m[3] ?? m[0]).trim();
        chNum = p.getCh(m);
      } else if (p.re.source.startsWith('^Chapter')) {
        title = m[2].trim();
        chNum = p.getCh(m);
      } else if (p.re.source.startsWith('^(\\d+(?:\\.\\d+)+)')) {
        title = m[2].trim();
        chNum = p.getCh(m);
      } else if (p.re.source.startsWith('^(\\d{1,2})')) {
        title = m[2].trim();
        chNum = p.getCh(m);
      } else if (p.re.source.startsWith('^([一二三四五六七八九十]+)')) {
        title = m[2].trim();
        chNum = p.getCh(m);
      } else {
        // Markdown 标题
        title = m[2].trim();
        chNum = null;
      }

      if (!title || title.length < 2) continue;
      if (title.length > 60) title = title.slice(0, 60);

      // 排除纯数字/符号标题
      if (/^[\d\s.、,，。;；:：]+$/.test(title)) continue;

      const finalCh = chNum ?? autoCh;
      // 无 第X章 结构时用行号递增作章节
      hits.push({ title, chNum: finalCh, depth: p.depth });
      autoCh++;
      break; // 只匹配第一个 pattern
    }
  }

  return hits;
}

/** 高频关键词兜底实体：从文本中提取出现频率高的名词短语 */
export function extractKeywordEntities(text: string, max = 50): { name: string; chNum: number }[] {
  const cleaned = text
    .replace(/[\x00-\x08\x0B-\x1F\x7F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
  const freq = new Map<string, number>();
  // 中英文单词/词组
  const words = cleaned.match(/[\u4e00-\u9fa5]{2,6}|[A-Za-z][A-Za-z-]{2,20}/g) ?? [];
  const stop = new Set([
    '我们', '他们', '这个', '那个', '一个', '没有', '自己', '什么', '知道', '已经',
    '可以', '但是', '因为', '所以', '如果', '还是', '就是', '不是', '时候', '这些',
    '那些', '这样', '那样', '现在', '然后', '觉得', '一样', '一起', '大家', '东西',
    '他说', '她说', '我说', '你说', '你们', '她们', '起来', '出来', '过去', '回来',
    '怎么', '为什么', '什么', '多少', '哪儿', '那里', '这里', '当时', '后来', '之后',
    '以前', '同时', '有些', '很多', '一定', '真的', '只是', '可是', '而且', '或者',
    '然后', '接着', '跟着', '再', '又', '都', '也', '却', '还', '就', '再', '没',
    'and', 'the', 'that', 'this', 'with', 'from', 'have', 'were', 'they', 'their',
    'about', 'there', 'when', 'what', 'which', 'while', 'after', 'before', 'being',
  ]);
  for (const w of words) {
    if (stop.has(w)) continue;
    if (/^[\d\s.]+$/.test(w)) continue;
    if (/^(他说|她说|我说|你说|起来|出来|回去|过来)$/.test(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  const sorted = [...freq.entries()]
    .filter(([, n]) => n >= 5) // 至少出现 5 次（提高质量）
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([name]) => ({ name, chNum: 1 }));
  return sorted;
}
