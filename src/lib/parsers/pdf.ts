/**
 * PDF 解析。
 *
 * ⚠️ 不要直接用 `pdf-parse`（npm 1.1.1），它在 import 时会自动跑一个内置测试
 *    （读取 ./test/data/05-versions-space.pdf），在 Vercel 等打包环境中会 ENOENT 失败。
 *
 * ✅ 用社区 fork `pdf-parse-debugging-disabled` 解决了这个问题。
 *    API 与 `pdf-parse` 完全一致，可随时切换。
 */
import pdf from 'pdf-parse-debugging-disabled';

export async function parsePdf(buf: Buffer): Promise<string> {
  const res = await pdf(buf);
  return res.text;
}