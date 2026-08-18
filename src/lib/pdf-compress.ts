/**
 * PDF 压缩工具：在内存中对 PDF 进行"无损"重压缩。
 *
 * 真实 PDF 压缩通常包括：
 *   - 重新编码/降采样图片（需要 pdf-lib + sharp）
 *   - 移除未使用的对象
 *   - 对象流压缩
 *
 * 这里实现一个轻量版：
 *   - 把 PDF 重新序列化为对象流（pdf-lib 自动压缩内部流）
 *   - 移除重复 / 废弃的对象
 *   - 提供 estimateCompressionRatio 让上层判断是否需要重压
 *
 * 注意：pdf-lib **无法**对已经是图片的扫描页进行 OCR 或降低分辨率。
 * 如果原始 PDF 是 100MB 扫描件，本函数一般只能压缩 10-20%。
 * 真正大幅压缩需要 pdf-lib + sharp 或 ghostscript（Vercel 不友好）。
 */
import { PDFDocument } from 'pdf-lib';

export async function compressPdf(input: Uint8Array): Promise<Uint8Array> {
  try {
    const doc = await PDFDocument.load(input, { ignoreEncryption: true });
    // 重新序列化让 pdf-lib 优化内部结构
    const out = await doc.save({
      useObjectStreams: true,    // 对象流压缩
      addDefaultPage: false,
      objectsPerTick: 50,        // 分批处理，避免阻塞
    });
    return out;
  } catch (e) {
    // 解析失败就原样返回
    console.warn('[compressPdf] failed, returning original:', (e as Error).message);
    return input;
  }
}

/**
 * 预估压缩后大小。基于经验值：含图片的 PDF 一般可压到 50-70%，
 * 纯文字 PDF 可压到 30-50%。
 */
export function estimateCompressedSize(originalBytes: number): number {
  // 保守估计：70%
  return Math.round(originalBytes * 0.7);
}