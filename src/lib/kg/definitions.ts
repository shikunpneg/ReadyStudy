/**
 * 定义提取 + 段落提取
 * 移植自 fast_read_book kg_core/builder.py
 */

const INDICATORS_ZH = ['是指', '指的是', '定义为', '即', '称为', '就是', '是', '表示', '描述', '简称'];
const INDICATORS_EN = ['is defined as', 'refers to', 'is', 'means', 'called', 'refers'];

function getIndicatorScore(sent: string): { score: number; indicator: string | null } {
  for (let i = INDICATORS_ZH.length - 1; i >= 0; i--) {
    if (sent.includes(INDICATORS_ZH[i])) {
      return { score: INDICATORS_ZH.length - i, indicator: INDICATORS_ZH[i] };
    }
  }
  for (let i = INDICATORS_EN.length - 1; i >= 0; i--) {
    if (sent.toLowerCase().includes(INDICATORS_EN[i])) {
      return { score: INDICATORS_EN.length - i, indicator: INDICATORS_EN[i] };
    }
  }
  return { score: 0, indicator: null };
}

function splitSentences(text: string): string[] {
  const sents = text.split(/(?<=[。！？；\n])\s*/);
  return sents.map((s) => s.trim()).filter((s) => s.length > 5);
}

/** 从章节文本中提取实体的定义句 */
export function extractDefinition(chText: string, entity: string, maxLen = 2000): string {
  if (!chText.includes(entity)) return '';
  const sents = splitSentences(chText);
  const firstPos = chText.indexOf(entity);
  const candidates: { total: number; idx: number; sent: string }[] = [];

  for (let i = 0; i < sents.length; i++) {
    const sent = sents[i];
    if (!sent.includes(entity)) continue;
    const sentPos = chText.indexOf(sent);
    if (sentPos < 0) continue;
    const distance = Math.abs(sentPos - firstPos);
    const { score: indScore } = getIndicatorScore(sent);
    if (indScore > 0) {
      const total = indScore * 500 - distance * 0.5;
      candidates.push({ total, idx: i, sent });
    }
  }

  candidates.sort((a, b) => b.total - a.total);
  if (candidates.length > 0) {
    const bestIdx = candidates[0].idx;
    const bestSent = candidates[0].sent;
    const ctxParts: string[] = [];
    if (bestIdx > 0) ctxParts.push(sents[bestIdx - 1].slice(-80));
    ctxParts.push(bestSent);
    if (bestIdx + 1 < sents.length) ctxParts.push(sents[bestIdx + 1].slice(0, 200));
    const ctx = cleanDef(ctxParts.join(''));
    return ctx.slice(0, maxLen);
  }

  // 降级
  for (const sent of sents) {
    if (sent.includes(entity) && sent.includes(entity + '是')) {
      return cleanDef(sent).slice(0, maxLen);
    }
  }
  for (const sent of sents) {
    if (sent.includes(entity) && sent.length >= 20 && sent.length <= 400) {
      return cleanDef(sent).slice(0, maxLen);
    }
  }
  return '';
}

function cleanDef(s: string): string {
  return s
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^(图\d+[-–—]\d+.*?[。；\n])/, '')
    .replace(/^(表\d+[-–—]\d+.*?[。；\n])/, '')
    .replace(/^\d+(\.\d+)+\s*\S{1,40}\n/, '');
}

/** 从章节文本中提取包含实体的段落 */
export function extractParagraph(chText: string, entity: string, maxLen = 6000): string {
  if (!chText.includes(entity)) return '';
  const pos = chText.indexOf(entity);
  const before = chText.slice(0, pos);

  let paraStart = 0;
  const dnl = before.lastIndexOf('\n\n');
  if (dnl >= 0) {
    paraStart = dnl + 2;
  } else {
    const secs = [...before.matchAll(/\d+\.\d+\.\d+\s+\S/g)];
    if (secs.length) paraStart = secs[secs.length - 1].index ?? 0;
  }

  const after = chText.slice(pos);
  let paraEnd = chText.length;
  const dnl2 = after.indexOf('\n\n');
  if (dnl2 >= 0 && dnl2 < 800) paraEnd = pos + dnl2;
  const nextSec = /\d+\.\d+\.\d+\s+\S/.exec(after);
  if (nextSec && nextSec.index < 800) paraEnd = Math.min(paraEnd, pos + nextSec.index);

  let paragraph = chText.slice(paraStart, paraEnd).trim();
  if (paragraph.length > maxLen) {
    const start = Math.max(0, pos - paraStart - 200);
    const end = Math.min(paragraph.length, pos - paraStart + 5000);
    paragraph = paragraph.slice(start, end);
  }
  return paragraph.replace(/\n{3,}/g, '\n\n').slice(0, maxLen);
}

/** 标题转实体名 */
export function titleToEntity(titleText: string): string {
  if (titleText.startsWith('什么是')) return titleText.slice(3);
  if (titleText.endsWith('简介')) {
    const core = titleText.slice(0, -2);
    if (core) return core;
  }
  return titleText;
}
