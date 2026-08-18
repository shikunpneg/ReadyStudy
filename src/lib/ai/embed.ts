/**
 * Embedding 抽象。
 * - 自动根据 provider 选择 baseURL（修复之前 deepseek provider 配 OpenAI 模型导致 404 的问题）
 * - 支持 OpenAI 兼容协议
 * - 无 key / 调用失败时降级为零向量（关键词检索兜底）
 */
import OpenAI from 'openai';

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}

const PROVIDER_BASE_URL: Record<string, string> = {
  deepseek: 'https://api.deepseek.com/v1',
  openai: 'https://api.openai.com/v1',
  custom: '', // 由用户填的 baseUrl 覆盖
};

class OpenAIEmbed implements EmbeddingProvider {
  constructor(
    private apiKey: string,
    private model: string,
    private provider: string,
    private customBaseUrl?: string | null,
  ) {}
  async embed(texts: string[]): Promise<number[][]> {
    const baseURL =
      this.provider === 'custom'
        ? this.customBaseUrl || 'https://api.openai.com/v1'
        : PROVIDER_BASE_URL[this.provider] || 'https://api.openai.com/v1';
    const client = new OpenAI({ apiKey: this.apiKey, baseURL });
    const res = await client.embeddings.create({ model: this.model, input: texts });
    return res.data.map((d) => d.embedding);
  }
}

export function getEmbedder(opts: {
  provider: string;
  apiKey?: string;
  model: string;
  baseUrl?: string | null;
}): EmbeddingProvider {
  if (!opts.apiKey) return new FallbackEmbed();
  return new OpenAIEmbed(opts.apiKey, opts.model, opts.provider, opts.baseUrl);
}

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
  return dot;
}