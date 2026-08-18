/**
 * EPUB 解析：EPUB 本质是 zip，包含 META-INF/container.xml、OEBPS/content.opf 和若干 HTML。
 * 思路：
 *   1) 找到 OPF（spine → manifest → 按顺序读取 HTML）
 *   2) 用正则 / HTML 标签提取纯文本
 */
import JSZip from 'jszip';

export async function parseEpub(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);

  // 1) 读 container.xml 找 OPF
  const containerXml = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerXml) throw new Error('invalid epub: missing container.xml');
  const opfPath = containerXml.match(/full-path="([^"]+\.opf)"/)?.[1];
  if (!opfPath) throw new Error('invalid epub: no opf path');

  // 2) 解析 OPF，拿到 manifest（id -> href）和 spine（order）
  const opfXml = await zip.file(opfPath)?.async('string');
  if (!opfXml) throw new Error('invalid epub: missing opf');

  const baseDir = opfPath.includes('/') ? opfPath.replace(/[^/]+$/, '') : '';
  const manifest: Record<string, string> = {};
  const manifestRe = /<item\s+([^>]+)\/?>/g;
  let m;
  while ((m = manifestRe.exec(opfXml))) {
    const attrs = m[1];
    const id = attrs.match(/id="([^"]+)"/)?.[1];
    const href = attrs.match(/href="([^"]+)"/)?.[1];
    if (id && href) manifest[id] = href;
  }

  const order: string[] = [];
  const spineRe = /<itemref\s+([^>]+)\/?>/g;
  while ((m = spineRe.exec(opfXml))) {
    const idref = m[1].match(/idref="([^"]+)"/)?.[1];
    if (idref) order.push(idref);
  }

  // 3) 按 spine 顺序拼接每个 HTML/XHTML 的纯文本
  const parts: string[] = [];
  for (const idref of order) {
    const href = manifest[idref];
    if (!href) continue;
    const fullPath = baseDir + href;
    const file = zip.file(fullPath);
    if (!file) continue;
    const html = await file.async('string');
    parts.push(extractTextFromHtml(html));
  }

  return parts.join('\n\n');
}

function extractTextFromHtml(html: string): string {
  // 移除 script / style
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  // 段落 / 换行
  s = s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n');

  // 去标签
  s = s.replace(/<[^>]+>/g, '');

  // 解码 HTML 实体
  s = decodeEntities(s);

  // 规范化空白
  s = s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  return s;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}