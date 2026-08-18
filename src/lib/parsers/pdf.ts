/**
 * PDF 解析（使用 Mozilla pdfjs-dist）。
 *
 * 比 pdf-parse 更准确：
 *   - 处理 CID 编码 / 字体子集正确率高
 *   - 中英文混排不会乱码
 *   - 支持扫描件（如果 PDF 内嵌了 OCR 层）
 *
 * 对完全光栅扫描的 PDF（无文本层），只能拿到空文本，需要客户端先 OCR。
 */
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function parsePdf(buf: Buffer): Promise<string> {
  // 把 Node Buffer 转为 Uint8Array（pdfjs 在 Node 端要这个）
  const data = new Uint8Array(buf);

  const loadingTask = pdfjs.getDocument({
    data,
    // 禁止抛错时的字体警告刷屏
    verbosity: 0,
    // 跳过损坏的对象
    stopAtErrors: false,
  });

  const doc = await loadingTask.promise;
  const lines: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // 按 Y 坐标排序（pdfjs 默认按出现顺序，但视觉顺序是按行）
    const items = (content.items as { str: string; transform: number[]; hasEOL?: boolean }[])
      .filter((it) => it.str && it.str.trim().length > 0)
      .map((it) => ({ str: it.str, y: it.transform[5], hasEOL: !!it.hasEOL }));

    // 按 Y 分组（同一行的文本合并）
    const rows: { y: number; texts: string[] }[] = [];
    for (const it of items) {
      const last = rows[rows.length - 1];
      if (last && Math.abs(last.y - it.y) < 2) {
        last.texts.push(it.str);
      } else {
        rows.push({ y: it.y, texts: [it.str] });
      }
    }

    const pageLines = rows.map((r) => r.texts.join(' ').replace(/\s+/g, ' ').trim());
    lines.push(pageLines.join('\n'));

    await page.cleanup();
  }

  await doc.cleanup();
  await doc.destroy();

  return lines.join('\n\n');
}