/**
 * Markdown 解析（纯文本 + 结构化）。
 *
 * 策略：
 *   1) 检测 frontmatter（YAML/TOML），剥掉
 *   2) 保留代码块内容（但加 fence 标记方便 LLM 识别）
 *   3) 链接 [text](url) → 保留 text + url 拼接
 *   4) 图片 ![alt](url) → 转成 [图片: alt]
 *   5) 保留标题层级（# / ## / ### 替换成"标题X："前缀）
 *   6) 去除行尾两个空格 + 水平分割线噪音
 *
 * 不做完整 GFM（避免 LLM 输出与原文差异过大），
 * 但保证结构清晰 + 原始代码块完整保留。
 */

export function parseMarkdown(text: string): string {
  let s = text;

  // 1) 去除 frontmatter（---...--- 或 +++...+++）
  s = s.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
  s = s.replace(/^\+\+\+\s*\n[\s\S]*?\n\+\+\+\s*\n/, '');

  // 2) 代码块：保留 + 标记语言
  s = s.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const tag = lang ? `[代码:${lang}]` : '[代码]';
    return `\n${tag}\n${code.trim()}\n[/代码]\n`;
  });

  // 3) 行内代码：`code` → 「code」
  s = s.replace(/`([^`]+)`/g, '「$1」');

  // 4) 链接 [text](url) → [text](url) 保留完整
  //    （删纯 URL 链接以避免污染 embedding）
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');

  // 5) 图片 ![alt](url) → [图片:alt]
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '[图片:$1]');

  // 6) 标题前缀
  s = s.replace(/^(#{1,6})\s+(.+)$/gm, (_, h, title) => {
    const level = h.length;
    return `${'#'.repeat(level)} ${title}`;
  });

  // 7) 列表项保留（- * + 开头）
  // 8) 强调：保留
  //    **bold** → bold
  //    *italic* → italic
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1');
  s = s.replace(/_([^_]+)_/g, '$1');

  // 9) 水平分割线 + 引用清理
  s = s.replace(/^[-*_]{3,}\s*$/gm, '');
  s = s.replace(/^>\s?/gm, '');

  // 10) 表格简化
  s = s.replace(/^\|.*\|$/gm, (line) => line.replace(/^\||\|$/g, ''));

  return s.trim();
}