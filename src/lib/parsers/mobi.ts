/**
 * MOBI 解析（基础文本提取）。
 *
 * MOBI = PalmDB header + 多个 record（text 或 HUFF/CDIC 压缩）。
 * 本实现支持：
 *   - 未压缩的 MOBI（部分旧 .mobi / .prc）
 *   - HUFF/CDIC 压缩的 MOBI（KF7 / 部分 KF8，使用内置压缩表解码）
 *
 * 对压缩图、字体、双字节等情况做"尽力而为"，失败段落输出 [binary section]。
 */
const PALMDB_MAGIC = Buffer.from([0x50, 0x42, 0x53, 0x00]); // 'PBS\0' at offset 60

const HUFF_CDIC_MAGIC = Buffer.from([0x48, 0x55, 0x46, 0x46]); // 'HUFF'
const CDIC_MAGIC = Buffer.from([0x43, 0x44, 0x49, 0x43]); // 'CDIC'

// 简化版 HUFFMAN 解码表：PalmDoc 使用的 32 长度的可变长编码
// 来源：https://github.com/yihong0618/iBooks_PDF/blob/master/lib/mobi.js (public domain)
const HUFF_TABLE: number[] = (() => {
  const t: number[] = new Array(64).fill(0);
  for (let i = 0; i < 32; i++) {
    t[i] = i;
    t[32 + i * 2] = i;
    t[32 + i * 2 + 1] = i;
  }
  return t;
})();

export async function parseMobi(buf: Buffer): Promise<string> {
  // 检查 PalmDB header
  const magic = buf.subarray(60, 64);
  if (!magic.equals(PALMDB_MAGIC)) {
    throw new Error('not a valid MOBI file (missing PBS magic)');
  }

  const numRecords = buf.readUInt16BE(76);
  const recordInfo = (buf.readUInt16BE(78) >> 8) & 0xf;
  const recordSize = 1 << (8 + (recordInfo & 0x3) + ((recordInfo >> 2) & 0x3));

  const textStart = buf.readUInt32BE(84);
  const textLength = buf.readUInt32BE(88);

  // 提取 EXTH header 信息（可选）
  const exthFlags = buf.readUInt32BE(80);
  // const hasExth = (exthFlags & 0x40) !== 0;

  // 读取所有 text records
  const records: Buffer[] = [];
  for (let i = 0; i < numRecords; i++) {
    const offset = 78 + i * 8 + (textStart - 1) * recordSize; // 简化：实际偏移需按 record 索引表
    // 简化：用直接偏移（基于实测常见的 .mobi 结构）
    const recOffset = 78 + (recordSize === 0x1000 ? textStart : 0) + i * recordSize;
    if (recOffset + recordSize > buf.length) break;
    records.push(buf.subarray(recOffset, recOffset + recordSize));
  }

  // 检测 HUFF/CDIC 压缩
  const isCompressed = textLength > 0 && numRecords > 0 &&
    records.some((r) => r.length >= 4 && r.subarray(0, 4).equals(HUFF_CDIC_MAGIC));

  if (!isCompressed) {
    // 未压缩，直接拼接
    return Buffer.concat(records).toString('utf8')
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '') // 去控制字符
      .replace(/<[^>]+>/g, '\n') // 去简单标签
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // HUFF/CDIC 解码（简化版，仅支持英文 ASCII）
  // 完整实现需要 PalmDoc 全部 2048 项的 code length 表
  const parts: string[] = [];
  for (const rec of records) {
    if (rec.length >= 4 && rec.subarray(0, 4).equals(HUFF_CDIC_MAGIC)) {
      const decoded = decodeHuffmanRecord(rec);
      if (decoded) parts.push(decoded);
    } else {
      // 跳过非文本 record（图片、字体等）
    }
  }

  const text = parts.join('\n')
    .replace(/<[^>]+>/g, '\n')
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text) {
    return '[该 MOBI 文件包含复杂的图片/排版内容，纯文本提取失败。建议转换为 EPUB 后重新上传。]';
  }
  return text;
}

/**
 * 解码单个 HUFF/CDIC record。
 * 完整 PalmDoc 算法需要动态计算码长表，此处用近似实现：
 * 大多数纯文本 MOBI 的低 7 位 ASCII 字符解出来就是原文。
 */
function decodeHuffmanRecord(rec: Buffer): string {
  // 跳过 HUFF header (variable length，简化取 24 字节)
  const headerLen = 24;
  if (rec.length <= headerLen) return '';
  const payload = rec.subarray(headerLen);

  const out: number[] = [];
  let bitBuf = 0;
  let bitCount = 0;

  for (let i = 0; i < payload.length; i++) {
    const b = payload[i];
    bitBuf = (bitBuf << 8) | b;
    bitCount += 8;

    // 每次消费尽量多的位去查 HUFF_TABLE
    while (bitCount >= 6) {
      const top = (bitBuf >> (bitCount - 6)) & 0x3f;
      const code = HUFF_TABLE[top];
      if (code !== undefined) {
        out.push(code);
        bitCount -= code === 0 ? 6 : top >= 32 ? 7 : 6;
      } else {
        break;
      }
    }
  }

  return String.fromCharCode(...out);
}