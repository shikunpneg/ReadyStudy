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

export interface Chunk {
  index: number;
  content: string;
  tokenCount: number;
}

/**
 * 文本切片：500 字/段，重叠 80 字。
 *
 * 上限 `MAX_CHUNKS` 防止大文件把 Vercel 函数内存打爆（1024MB 上限）。
 * 当切片超过上限时，按字符密度均匀采样，丢弃中间段。
 */
const MAX_CHUNKS = 200; // 安全上限，避免 OOM
const DEFAULT_CHUNK_SIZE = 500;
const DEFAULT_OVERLAP = 80;

export function chunkText(
  text: string,
  size = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_OVERLAP,
): Chunk[] {
  // 1) 大幅净化文本，释放内存 + 修复 PDF 提取常见的乱码
  let clean = text
    // 去 NUL 等控制字符（PDF 提取常见问题）
    .replace(/[\x00-\x08\x0B-\x1F\x7F]/g, '')
    // 去零宽字符 / BOM 残留
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // 规范化换行
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\t\f\v]+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    // 去孤立单字符（PDF 字体子集常见"字符分裂"导致的噪点）
    // 保留 CJK 字符、标点、英文单词
    .replace(/(\S)\n(\S)\n(\S)\n/g, '$1$2$3\n') // 合并 3 行短行（PDF 表格片段）
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!clean) return [];

  // 2) 总字符数过大切均匀采样（保留开头 + 结尾 + 中间均匀点）
  // 经验阈值：MAX_CHUNKS * size * 1.5 ~= 150k 字符（≈ 5MB PDF 文本）
  const totalChars = clean.length;
  const maxSafeChars = MAX_CHUNKS * size * 1.5;
  if (totalChars > maxSafeChars) {
    // 均匀选 MAX_CHUNKS 段，每段 size
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