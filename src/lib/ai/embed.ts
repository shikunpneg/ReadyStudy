/**
 * Embedding 抽象。优先使用用户 BYOK，否则在 Vercel KV 不可用且无 key 时降级到"零向量 + 关键词检索"。
 */
import OpenAI from 'openai';

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}

class OpenAIEmbed implements EmbeddingProvider {
  constructor(private apiKey: string, private model: string) {}
  async embed(texts: string[]): Promise<number[][]> {
    const client = new OpenAI({ apiKey: this.apiKey });
    const res = await client.embeddings.create({ model: this.model, input: texts });
    return res.data.map((d) => d.embedding);
  }
}

/**
 * DeepSeek 当前未提供独立 embedding 模型，回退到 OpenAI 兼容的 text-embedding-3-small。
 * 如未来接入 BGE / M3E，可在此扩展。
 */
export function getEmbedder(opts: { provider: string; apiKey?: string; model: string }): EmbeddingProvider {
  if (!opts.apiKey) {
    return new FallbackEmbed();
  }
  // DeepSeek 当前不提供 embedding，复用 OpenAI 即可
  const key = opts.apiKey;
  return new OpenAIEmbed(key, opts.model);
}

/**
 * 零向量占位 + 关键词匹配兜底。
 * 检索阶段我们额外做关键词匹配弥补语义不足。
 */
class FallbackEmbed implements EmbeddingProvider {
  async embed(texts: string[]): Promise<number[][]> {
    const dim = 16;
    return texts.map((t) => zeroHashEmbedding(t, dim));
  }
}

function zeroHashEmbedding(text: string, dim: number): number[] {
  const v = new Array(dim).fill(0);
  for (let i = 0; i < text.length; i++) {
    v[i % dim] += text.charCodeAt(i) / 65535;
  }
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot; // 两向量已归一化
}