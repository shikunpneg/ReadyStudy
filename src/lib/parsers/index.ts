/**
 * 文档解析器统一入口。
 * 支持：pdf / txt / pptx / docx / epub / mobi
 */
import { parsePdf } from './pdf';
import { parseTxt } from './txt';
import { parsePptx } from './pptx';
import { parseDocx } from './docx';
import { parseEpub } from './epub';
import { parseMobi } from './mobi';

export type SupportedType = 'pdf' | 'txt' | 'pptx' | 'docx' | 'epub' | 'mobi';

export async function parseDocument(buffer: Buffer, type: SupportedType): Promise<string> {
  switch (type) {
    case 'pdf':
      return parsePdf(buffer);
    case 'txt':
      return parseTxt(buffer);
    case 'pptx':
      return parsePptx(buffer);
    case 'docx':
      return parseDocx(buffer);
    case 'epub':
      return parseEpub(buffer);
    case 'mobi':
      return parseMobi(buffer);
    default:
      throw new Error(`Unsupported type: ${type}`);
  }
}

export function detectType(filename: string): SupportedType | null {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'txt' || ext === 'md') return 'txt';
  if (ext === 'pptx' || ext === 'ppt') return 'pptx';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  if (ext === 'epub') return 'epub';
  if (ext === 'mobi' || ext === 'azw' || ext === 'azw3' || ext === 'prc') return 'mobi';
  return null;
}

/**
 * 文本切片：按段落/句子优先，500 字/段，重叠 80 字。
 */
export interface Chunk {
  index: number;
  content: string;
  tokenCount: number;
}

export function chunkText(text: string, size = 500, overlap = 80): Chunk[] {
  const clean = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!clean) return [];
  const chunks: Chunk[] = [];
  let i = 0;
  let idx = 0;

  while (i < clean.length) {
    const end = Math.min(i + size, clean.length);
    let slice = clean.slice(i, end);

    // 尽量在句末/段末断开
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

    chunks.push({
      index: idx++,
      content: slice.trim(),
      // 粗略按 1.5 字符/token 估算
      tokenCount: Math.ceil(slice.length / 1.5),
    });

    i += slice.length - overlap;
    if (i <= 0) i = end;
  }
  return chunks;
}