/**
 * 文档结构抽取：PDF outline / EPUB spine / Markdown headers / HTML h1-h6。
 * 用于原生思维导图（不是 LLM 生成的）。
 */

export interface OutlineNode {
  title: string;
  page?: number;
  level: number;
  children: OutlineNode[];
}

const EMPTY: OutlineNode = { title: '', level: 0, children: [] };

/** PDF：pdfjs getOutline */
export async function extractPdfOutline(pdfjs: any, doc: any): Promise<OutlineNode | null> {
  try {
    const outline = await doc.getOutline();
    if (!outline || outline.length === 0) return null;
    const tree = await Promise.all(
      outline.map(async (item: any) => await buildPdfNode(pdfjs, doc, item, 1)),
    );
    return { title: '本书目录', level: 0, children: tree };
  } catch {
    return null;
  }
}

async function buildPdfNode(pdfjs: any, doc: any, item: any, level: number): Promise<OutlineNode> {
  let page: number | undefined;
  try {
    if (item.dest) {
      const dest = typeof item.dest === 'string' ? await doc.getDestination(item.dest) : item.dest;
      const pageRef = Array.isArray(dest) ? dest[0] : null;
      const pageIndex = await pdfjs.PDFPageProxy;
      // 不同 pdfjs 版本 API 不同，容错
      if (pageRef && doc.getPageIndex) {
        page = (await doc.getPageIndex(pageRef)) + 1;
      }
    }
  } catch {
    /* ignore */
  }
  const node: OutlineNode = {
    title: item.title || '(无标题)',
    level,
    page,
    children: [],
  };
  if (item.items?.length) {
    node.children = await Promise.all(
      item.items.map(async (sub: any) => await buildPdfNode(pdfjs, doc, sub, level + 1)),
    );
  }
  return node;
}

/** EPUB：直接返回 spine，标题来自 manifest 中的 nav.xhtml */
export async function extractEpubOutline(zip: any, opfXml: string, opfPath: string): Promise<OutlineNode | null> {
  try {
    const baseDir = opfPath.includes('/') ? opfPath.replace(/[^/]+$/, '') : '';
    const manifest: Record<string, string> = {};
    const manifestRe = /<item\s+([^>]+)\/?>/g;
    let m;
    while ((m = manifestRe.exec(opfXml))) {
      const id = m[1].match(/id="([^"]+)"/)?.[1];
      const href = m[1].match(/href="([^"]+)"/)?.[1];
      if (id && href) manifest[id] = href;
    }

    const order: string[] = [];
    const spineRe = /<itemref\s+([^>]+)\/?>/g;
    while ((m = spineRe.exec(opfXml))) {
      const idref = m[1].match(/idref="([^"]+)"/)?.[1];
      if (idref) order.push(idref);
    }

    // 找 nav.xhtml（EPUB3）或 ncx（EPUB2）
    const navEntry = Object.entries(manifest).find(([_, href]) => /nav\.x?html?$/i.test(href));
    if (navEntry) {
      const html = await zip.file(baseDir + navEntry[1])?.async('string');
      if (html) {
        const tree = parseNavHtml(html);
        if (tree.length) return { title: '本书目录', level: 0, children: tree };
      }
    }

    // 没有 nav：fallback 到 spine 文件名
    const fallback = order
      .map((id) => manifest[id])
      .filter(Boolean)
      .map((href) => href.split('/').pop()?.replace(/\.x?html?$/i, '') || href);
    if (fallback.length === 0) return null;
    return {
      title: '本书目录',
      level: 0,
      children: fallback.map((t) => ({ title: t, level: 1, children: [] })),
    };
  } catch {
    return null;
  }
}

function parseNavHtml(html: string): OutlineNode[] {
  const out: OutlineNode[] = [];
  // 抓所有 <a> 标签，按 <h*> 层级
  const re = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>|<a[^>]*>([^<]+)<\/a>/gi;
  let m;
  let currentLevel = 0;
  const stack: OutlineNode[] = [];
  while ((m = re.exec(html))) {
    if (m[1]) {
      currentLevel = Number(m[1][1]);
      // 标题当作新章节
      const title = m[2].replace(/<[^>]+>/g, '').trim();
      const node: OutlineNode = { title, level: currentLevel, children: [] };
      // 入栈
      while (stack.length && stack[stack.length - 1].level >= currentLevel) stack.pop();
      if (stack.length) stack[stack.length - 1].children.push(node);
      else out.push(node);
      stack.push(node);
    } else if (m[3]) {
      // 链接文本
      const title = m[3].trim();
      const node: OutlineNode = { title, level: (stack.length ? stack[stack.length - 1].level + 1 : 1), children: [] };
      if (stack.length) stack[stack.length - 1].children.push(node);
      else out.push(node);
    }
  }
  return out;
}

/** Markdown headers */
export function extractMarkdownOutline(md: string): OutlineNode | null {
  const lines = md.split(/\r?\n/);
  const out: OutlineNode[] = [];
  const stack: OutlineNode[] = [];

  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const level = m[1].length;
    const title = m[2].trim();
    const node: OutlineNode = { title, level, children: [] };

    while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
    if (stack.length) stack[stack.length - 1].children.push(node);
    else out.push(node);
    stack.push(node);
  }

  if (out.length === 0) return null;
  return { title: '文档目录', level: 0, children: out };
}

/** HTML h1-h6 */
export function extractHtmlOutline(html: string): OutlineNode | null {
  const out: OutlineNode[] = [];
  const stack: OutlineNode[] = [];
  const re = /<h([1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(html))) {
    const level = Number(m[1]);
    const title = m[2].replace(/<[^>]+>/g, '').trim();
    if (!title) continue;
    const node: OutlineNode = { title, level, children: [] };
    while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
    if (stack.length) stack[stack.length - 1].children.push(node);
    else out.push(node);
    stack.push(node);
  }
  if (out.length === 0) return null;
  return { title: '文档目录', level: 0, children: out };
}