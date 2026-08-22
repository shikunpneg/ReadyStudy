import { parseMarkdown } from './markdown';

/**
 * TXT / Markdown 通用解析。
 *
 * Markdown 识别（启发式）：
 *   - 文件名以 .md 结尾
 *   - 或内容首行匹配 ^# / ^--- / ``` / ^>\s
 */
export function parseTxt(buf: Buffer, isMarkdown = false): string {
  // 优先尝试 UTF-8，失败再试 GBK
  let raw: string;
  try {
    const s = buf.toString('utf8');
    if (s.includes('\uFFFD')) throw new Error('try gbk');
    raw = s;
  } catch {
    try {
      raw = new TextDecoder('gbk', { fatal: false }).decode(buf);
    } catch {
      raw = new TextDecoder('utf-8', { fatal: false }).decode(buf);
    }
  }

  if (isMarkdown || looksLikeMarkdown(raw)) {
    return parseMarkdown(raw);
  }
  return raw;
}

function looksLikeMarkdown(text: string): boolean {
  const sample = text.slice(0, 500);
  return (
    /^#{1,6}\s+\S/m.test(sample) || // # 标题
    /^---+\s*$/m.test(sample) || // frontmatter 或分割线
    /^```/.test(sample) || // 代码块开始
    /^\s*[-*+]\s+\S/m.test(sample) || // 列表
    /^\s*\d+\.\s+\S/m.test(sample) // 有序列表
  );
}