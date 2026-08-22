PDF 论文翻译 → 中文 HTML 标准流程
建立于 2025-06-19。后续所有论文翻译均按此标准执行。

=== 核心原则 ===
1. 纯 HTML 渲染：不依赖任何外部 CDN、KaTeX、MathJax
2. 数学公式：全部使用 <sub> / <sup> / <span> 标签手动编写，绝不用 LaTeX 命令
3. 100% 本地可用：无网络请求，图片 base64 内嵌

=== 标准流程 ===

Step 1：提取 PDF 文本
使用 read_document 工具（offset/limit 分页）提取全文，保存到 *.txt 文件（UTF-8）

Step 2：翻译并生成 HTML
直接用中文撰写/翻译内容（基于原文结构）。数学公式手写为 HTML。

常用对照：
  下标     N_c      →  N<sub>c</sub>
  上标     C^0.73   →  C<sup>0.73</sup>
  乘方     10^13    →  10<sup>13</sup>
  乘号     ×        →  ×
  约等于   ≈        →  ≈
  正比于   ∝        →  ∝
  希腊字母 α, β    →  α, β

Step 3：图片处理
收集论文图片 → base64 编码 → 内嵌到 <img src="data:image/png;base64,...">
图片保存在 paper_images/ 目录

Step 4：HTML 模板结构
- Times New Roman / Georgia 字体，11pt，字号 1.85 行高
- max-width: 820px，padding 60px 80px，box-shadow 阴影
- h1 居中 20pt，h2 13pt 加粗，下边框分隔
- 公式框 .fbox：灰色背景 #f8f9fa，圆角 8px，居中 10.5pt
- 图片 .fig：居中，max-height:420px，带边框阴影
- 特殊提示框：.kr（橙色），.hb（绿色），.wb（红色），.sn（蓝色）

=== 常用符号表 ===
α α  β β  γ γ  δ δ  ε ε  λ λ  σ σ  Σ Σ  ∞ ∞
≈ ≈  ∝ ∝  × ×  · ·  ≤ ≤  ≥ ≥  ≠ ≠  ± ±  ～ ～
→ →  ∈ ∈  √ √  ∑ ∑  ∏ ∏

=== 文件命名规范 ===
{论文缩写}_{arXiv号}_中文版.html
例如：Kaplan_2001.08361_中文版.html
图片放在 paper_images/ 目录

=== 关键教训 ===
1. 不要用 KaTeX CDN：国内访问不了，渲染失败后显示原始 LaTeX 代码
2. 不要用 \alpha、\beta 这种 LaTeX 命令：如果 KaTeX 失败，页面会直接显示原始文本
3. 直接手写 HTML：所有符号用 Unicode，所有上下标用 <sub>/<sup> 标签
4. 从零生成 HTML：不要在已有文件上做替换，容易出现残留和格式混乱

=== 验证清单 ===
生成 HTML 后检查：
- 搜索 \alpha、\beta、\times、\approx、\propto、\quad、\left、\right、\frac — 必须无残留
- 公式框中 <sup> 和 <sub> 标签是否正确嵌套
- 图片是否以 data:image/png;base64, 开头
- 浏览器开发者工具 Console 无报错
