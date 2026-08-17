export function parseTxt(buf: Buffer): string {
  // 优先尝试 UTF-8，失败再试 GBK
  try {
    const s = buf.toString('utf8');
    if (s.includes('\uFFFD')) throw new Error('try gbk');
    return s;
  } catch {
    // Node 自带 iconv-lite 太重，这里用 TextDecoder 兜底
    try {
      return new TextDecoder('gbk', { fatal: false }).decode(buf);
    } catch {
      return new TextDecoder('utf-8', { fatal: false }).decode(buf);
    }
  }
}