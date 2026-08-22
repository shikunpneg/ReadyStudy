/**
 * 文档解析器统一入口。
 * 支持：pdf / txt / md / pptx / docx / epub / mobi / html / htm
 */
import { parsePdf } from './pdf';
import { parseTxt } from './txt';
import { parsePptx } from './pptx';
import { parseDocx } from './docx';
import { parseEpub } from './epub';
import { parseMobi } from './mobi';
import { parseHtml } from './html';

export type SupportedType =
  | 'pdf'
  | 'txt'
  | 'md'
  | 'pptx'
  | 'docx'
  | 'epub'
  | 'mobi'
  | 'html';

export async function parseDocument(
  buffer: Buffer,
  type: SupportedType,
  originalName?: string,
): Promise<string> {
  switch (type) {
    case 'pdf':
      return parsePdf(buffer);
    case 'txt':
      return parseTxt(buffer, false);
    case 'md':
      return parseTxt(buffer, true);
    case 'pptx':
      return parsePptx(buffer);
    case 'docx':
      return parseDocx(buffer);
    case 'epub':
      return parseEpub(buffer);
    case 'mobi':
      return parseMobi(buffer);
    case 'html':
      return parseHtml(buffer);
    default:
      throw new Error(`Unsupported type: ${type}`);
  }
}

export function detectType(filename: string): SupportedType | null {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'md' || ext === 'markdown') return 'md';
  if (ext === 'txt') return 'txt';
  if (ext === 'pptx' || ext === 'ppt') return 'pptx';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  if (ext === 'epub') return 'epub';
  if (ext === 'mobi' || ext === 'azw' || ext === 'azw3' || ext === 'prc') return 'mobi';
  if (ext === 'html' || ext === 'htm' || ext === 'xhtml') return 'html';
  return null;
}

export interface Chunk {
  index: number;
  content: string;
  tokenCount: number;
}

/**
 * 文本切片：500 字/段，重叠 80 字。
 *
 * 上限 `MAX_CHUNKS` 防止大文件把 Vercel 函数内存打爆（1024MB 上限）。
 */
const MAX_CHUNKS = 200;
const DEFAULT_CHUNK_SIZE = 500;
const DEFAULT_OVERLAP = 80;

export function chunkText(
  text: string,
  size = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_OVERLAP,
): Chunk[] {
  // 1) 大幅净化文本
  let clean = text
    .replace(/[\x00-\x08\x0B-\x1F\x7F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\t\f\v]+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!clean) return [];

  // 2) 过大则均匀采样
  const totalChars = clean.length;
  const maxSafeChars = MAX_CHUNKS * size * 1.5;
  if (totalChars > maxSafeChars) {
    const step = Math.floor(totalChars / MAX_CHUNKS);
    let sampled = '';
    for (let i = 0; i < MAX_CHUNKS; i++) {
      const start = i * step;
      const end = Math.min(start + size, totalChars);
      if (start >= totalChars) break;
      sampled += clean.slice(start, end) + '\n\n';
    }
    clean = sampled;
  }

  // 3) 切片
  const chunks: Chunk[] = [];
  let i = 0;
  let idx = 0;

  while (i < clean.length && idx < MAX_CHUNKS) {
    const end = Math.min(i + size, clean.length);
    let slice = clean.slice(i, end);

    if (end < clean.length) {
      const lastBreak = Math.max(
        slice.lastIndexOf('。'),
        slice.lastIndexOf('.\n'),
        slice.lastIndexOf('！'),
        slice.lastIndexOf('？'),
        slice.lastIndexOf('\n\n'),
      );
      if (lastBreak > size * 0.5) slice = slice.slice(0, lastBreak + 1);
    }

    const trimmed = slice.trim();
    if (trimmed.length > 0) {
      chunks.push({
        index: idx++,
        content: trimmed,
        tokenCount: Math.ceil(trimmed.length / 1.5),
      });
    }

    const advance = slice.length - overlap;
    i += advance > 0 ? advance : end - i;
  }

  return chunks;
}