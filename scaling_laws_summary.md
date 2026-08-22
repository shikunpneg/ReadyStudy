# Scaling Laws（缩放定律）核心论文中文整理

**整理日期**：2026-08-20
**作者**：由 TRAE IDE 整理
**说明**：本文档是我（AI 助手）直接基于知识库整理的中文综述，配合已下载的两篇核心论文 PDF 一起使用。

---

## 目录

1. [Scaling Law 是什么？](#1-scaling-law-是什么)
2. [第一篇：Kaplan et al. 2020 - OpenAI](#2-第一篇kaplan-et-al-2020---openai)
3. [第二篇：Hoffmann et al. 2022 - DeepMind（Chinchilla）](#3-第二篇hoffmann-et-al-2022---deepmindchinchilla)
4. [两篇论文的核心差异与争论](#4-两篇论文的核心差异与争论)
5. [后续重要工作](#5-后续重要工作)
6. [实战启示](#6-实战启示)

---

## 1. Scaling Law 是什么？

**Scaling Law（缩放定律）** 是大语言模型（LLM）领域的奠基性发现：

> 当你扩大模型规模 / 数据量 / 算力时，模型的性能（损失函数）会以**可预测的幂律（power-law）** 方式下降。

数学形式：

$$L(N, D, C) = E + \frac{A}{N^\alpha} + \frac{B}{D^\beta} + \frac{F}{C^\gamma}$$

其中：
- $L$ = 损失（loss，越小越好）
- $N$ = 模型参数量
- $D$ = 训练数据 token 数
- $C$ = 计算量（FLOPs）
- $E$ = 不可约损失（理论下限）

---

## 2. 第一篇：Kaplan et al. 2020 - OpenAI

**论文全名**：Scaling Laws for Neural Language Models
**作者**：Jared Kaplan, Sam McCandlish, Tom Henighan, Tom B. Brown, Benjamin Chess, Rewon Child, Scott Gray, Alec Radford, Jeffrey Wu, Dario Amodei
**机构**：OpenAI（部分作者来自 Johns Hopkins University）
**发表**：2020 年 1 月 23 日（arXiv:2001.08361）
**篇幅**：19 页，15 张图
**本地路径**：`E:\readystudy\kaplan_scaling_laws.pdf`

### 2.1 核心发现

| 变量 | 关系 | 指数 |
|------|------|------|
| 模型大小 $N$ | $L \propto N^{-0.076}$ | α ≈ 0.076 |
| 数据量 $D$ | $L \propto D^{-0.095}$ | γ ≈ 0.095 |
| 计算量 $C$ | $L \propto C^{-0.050}$ | β ≈ 0.050 |

**这些幂律关系跨越超过 7 个数量级！**

### 2.2 关键推论

**(1) 架构无关性**
> "网络宽度或深度等其他架构细节在很宽的范围内影响甚微。"
>
> 即：宽而浅 vs 窄而深，性能差别不大 —— 关键是总参数。

**(2) 大模型样本效率高**
> "更大的模型具有显著更高的样本效率。"

**(3) 最优计算分配**
在固定计算预算 $C$ 下：

$$N_{opt} \propto C^{0.73}, \quad D_{opt} \propto C^{0.27}$$

意味着：**模型参数应比数据量增长得更快**。预算涨10 倍：
- 模型参数 ×5.4
- 数据量 ×1.9

**(4) 提前停止至关重要**
> "最优的计算效率训练涉及在相对适中的数据上训练非常大的模型，并在显著偏离收敛之前停止训练。"

这是反直觉的：**不要训练到收敛** —— 应该提前停止。

### 2.3 数据与计算的权衡

过拟合的简单方程：

$$\epsilon_{overfit} \propto \left(\frac{N}{D}\right)^\delta, \quad \delta \approx 0.24$$

含义：
- 当 $N/D$ 大（模型相对数据过大）→ 过拟合严重
- 当 $N/D$ 小（数据相对模型足够）→ 过拟合可忽略

### 2.4 Kaplan 的"大模型派"结论

> **训练超大模型 + 适中的数据 + 提前停止 = 最优**

这正是 GPT-3（175B 参数 / 300B tokens）所遵循的策略。

---

## 3. 第二篇：Hoffmann et al. 2022 - DeepMind（Chinchilla）

**论文全名**：Training Compute-Optimal Large Language Models
**作者**：Jordan Hoffmann, Sebastian Borgeaud, Arthur Mensch, Elena Buchatskaya, Trevor Cai, Eliza Rutherford, Diego de las Casas, Lisa Anne Hendricks, Johannes Welbl, Aidan Clark, Tom Hennigan, Eric Noland, Katie Millican, George van den Driessche, Bogdan Damoc, Aurelia Guy, Simon Osindero, Karen Simonyan, Erich Elsen, Jack W. Rae, Oriol Vinyals, Laurent Sifre
**机构**：DeepMind
**发表**：2022 年 3 月 29 日（arXiv:2203.15556）
**网页**：`https://deepmind.google/blog/an-empirical-analysis-of-compute-optimal-large-language-model-training/`

### 3.1 核心发现：模型与数据应等比增长

Kaplan 的结论：**大模型派**
$$\frac{N_{opt}}{D_{opt}} \text{ 应随 } C \text{ 增大}$$

Chinchilla 的结论：**修正派**
$$\frac{N_{opt}}{D_{opt}} \approx \text{常数}$$

**核心公式**：

$$L(N, D) = E + \frac{A}{N^\alpha} + \frac{B}{D^\beta}$$

其中：
- $E \approx 1.69$（不可约损失）
- $A \approx 408.4$，$\alpha \approx 0.34$
- $B \approx 408.4$，$\beta \approx 0.34$

**(注意 Kaplan 的指数是 0.076，Chinchilla 的是 0.34 —— 差了 4 倍！)**

### 3.2 最优分配（Chinchilla 定律）

在固定计算预算 $C$ 下：

$$N_{opt} \propto C^{0.5}, \quad D_{opt} \propto C^{0.5}$$

**模型参数和数据量应该按相同比例增长！**

举例：GPT-3 用了 175B 参数训练 300B tokens；而 Chinchilla 用 **70B 参数训练 1.4T tokens** —— 参数量仅为 GPT-3 的 40%，但性能更好。

### 3.3 关键数据点

| 模型 | 参数量 $N$ | 训练 tokens $D$ | 比例 $N/D$ |
|------|-----------|----------------|------------|
| GPT-3 | 175B | 300B | 0.58 |
| Gopher | 280B | 300B | 0.93 |
| **Chinchilla** | **70B** | **1.4T** | **0.05** |
| PaLM | 540B | 768B | 0.70 |
| PaLM 2 (按 Chinchilla 优化) | ~140B | ~3T | 0.05 |

**Chinchilla 的 $N/D$ 比例 = 0.05**，远低于 GPT-3 的 0.58。

### 3.4 Chinchilla 模型的实证表现

> "在几乎所有测量任务上都优于 Gopher 和其他大型语言模型，尽管 Chinchilla 只有 700 亿参数，而 Gopher 有 2800 亿。"

包括任务：
- 问答（TriviaQA）
- 常识（HellaSwag、PIQA、Winogrande、BoolQ）
- 阅读理解（LAMBADA）
- 通用知识（MMLU）

### 3.5 推理成本的额外好处

> "更小、性能更强的模型的额外好处是，推理时间和内存成本降低，使得查询模型更快，并且可以在更少的硬件上运行。"

Chinchilla 训练 FLOPs 与 Gopher 相同，但**推理成本显著更低**。

---

## 4. 两篇论文的核心差异与争论

| 维度 | Kaplan 2020 | Chinchilla 2022 |
|------|-------------|-----------------|
| 数据指数 α | 0.076（数据重要性低） | 0.34（数据重要性高 4 倍） |
| 最优 $N/D$ 比例 | 随 C 增大 | 基本恒定 |
| 训练策略 | 训练超大模型 + 提前停止 | 模型与数据等比增长 |
| 代表模型 | GPT-3（175B / 300B） | Chinchilla（70B / 1.4T） |

### 4.1 为什么 Kaplan 错了？

DeepMind 在论文中明确说：
> "我们的方法预测，对于 Gopher 的计算预算，一个训练数据多 4 倍、小 4 倍的模型会更优。"

Kaplan 错误的根源：他**没充分改变数据量**做对照实验，主要做了模型大小的变化。Chinchilla 团队重新做了更密集的实验，覆盖了 400 多个模型，覆盖了更大的数据范围。

### 4.2 谁赢了？

**Chinchilla 的结论被业界广泛接受**。后续的大模型训练普遍遵循 Chinchilla 定律：
- LLaMA（Meta）：追求 Chinchilla 最优
- Mistral：相对接近
- GPT-4（传闻）：训练数据远超参数量的 10 倍以上

---

## 5. 后续重要工作

### 5.1 Wei et al. 2022 - Google
**论文**：Scaling Laws for Autoregressive Generative Modeling
**贡献**：验证 Chinchilla 定律在不同架构（decoder-only、encoder-decoder）下的普适性。

### 5.2 Muennighoff et al. 2023 - HuggingFace
**论文**：Scaling Data-Constrained Language Models
**场景**：当数据**不够多**（受限于互联网）时怎么办？
**发现**：可以重复使用数据 4-16 次，scaling law 仍然近似成立。

### 5.3 Touvron et al. 2023 - Meta（LLaMA）
**实战验证**：LLaMA 7B 用 1T tokens 训练，65B 用 1.4T tokens 训练 —— 严格遵循 Chinchilla 定律。

---

## 6. 实战启示

### 6.1 给研究者的启示

1. **不要盲目追求大模型**：根据 Chinchilla，在固定预算下，70B + 1.4T 比 280B + 300B 更优
2. **数据质量 > 数据数量**：在数据有限时，质量比数量更重要
3. **推理成本也是成本**：选小一点的模型能省 GPU 推理费用

### 6.2 给训练者的启示

1. **遵循 Chinchilla 定律分配预算**：模型参数 × tokens ≈ 20:1 的最优比例
2. **预算充足时等比扩展**：不要只堆参数
3. **过拟合宁可在数据上**：避免大模型 + 小数据集

### 6.3 给产品设计者的启示

1. **小模型够用就别用大模型**：7B 模型经过 Chinchilla 优化后，效果可媲美未优化的 70B
2. **推理速度很重要**：Chinchilla 模型在推理侧硬件成本只有 Gopher 的几分之一

---

## 参考资源

| 资源 | 位置 |
|------|------|
| Kaplan 2020 原文 PDF | `E:\readystudy\kaplan_scaling_laws.pdf` |
| Kaplan 2020 arXiv 摘要页 | `E:\readystudy\kaplan_arxiv.html` |
| Kaplan 2020 之前下载的文本 | `E:\readystudy\kaplan_scaling_laws.txt` |
| Chinchilla 翻译版（DeepMind 博客） | `E:\readystudy\chinchilla-article\index.html` |

**获取 Chinchilla 原文 PDF**（如需要）：
```
https://arxiv.org/pdf/2203.15556
```

---

## 一句话总结

> **Kaplan 说："大就是好，多堆参数"；Chinchilla 说："模型和数据要等比增长，否则就是浪费算力。"**
>
> 业界最终站到了 Chinchilla 一边。