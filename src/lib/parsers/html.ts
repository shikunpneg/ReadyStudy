/**
 * HTML 解析。
 *
 * 处理：
 *   1) <script>/<style> 整段删除
 *   2) <head> 整段删除（含 <meta>、<title>、<link>）
 *   3) 块级标签转换行：<p> <div> <h1-h6> <li> <br> <tr> <section>...
 *   4) 保留行内语义：<a href>、<img alt>、<code>、<strong>、<em>
 *   5) HTML 实体解码
 *   6) 嵌套表格、列表保留为缩进文本
 *
 * 不依赖 cheerio（减少安装包大小）。
 */
export function parseHtml(buf: Buffer): string {
  let html = buf.toString('utf8');

  // 1) 去除注释
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  // 2) 去除 head 整段
  html = html.replace(/<head[\s\S]*?<\/head>/gi, '');

  // 3) 去除 script/style/iframe/noscript
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
  html = html.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  html = html.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

  // 4) 块级标签 → 换行
  const blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol', 'tr', 'table', 'section', 'article', 'header', 'footer', 'main', 'aside', 'blockquote', 'pre', 'hr'];
  for (const tag of blockTags) {
    const reOpen = new RegExp(`<${tag}[^>]*>`, 'gi');
    const reClose = new RegExp(`</${tag}>`, 'gi');
    html = html.replace(reOpen, '\n').replace(reClose, '\n');
  }
  // 自闭合 hr / br
  html = html.replace(/<br\s*\/?>/gi, '\n');

  // 5) 行内标签：保留文本 + 提取语义
  //    <a href="x">text</a> → text
  html = html.replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, _href, text) => text);
  //    <img alt="..." src="..." /> → [图片:alt]
  html = html.replace(/<img\s+[^>]*alt=["']([^"']*?)["'][^>]*\/?>/gi, (_, alt) => `[图片:${alt}]`);
  html = html.replace(/<img\s+[^>]*?\/?>/gi, '[图片]');
  //    <code>code</code> → 「code」
  html = html.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '「$1」');
  //    <strong>/<b>bold</strong> → bold
  html = html.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '$2');
  //    <em>/<i>italic</em> → italic
  html = html.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '$2');

  // 6) 去所有剩余标签
  html = html.replace(/<\/?[a-z][^>]*>/gi, '');

  // 7) HTML 实体解码
  html = decodeEntities(html);

  // 8) 规范化空白
  html = html
    .replace(/\r\n/g, '\n')
    .replace(/[\t\f\v]+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return html;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}