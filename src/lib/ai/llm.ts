/**
 * LLM 统一抽象。支持 DeepSeek / OpenAI / 任意 OpenAI 兼容自定义服务。
 */
import OpenAI from 'openai';

export type LlmMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface LlmOptions {
  provider: 'deepseek' | 'openai' | 'custom';
  apiKey: string;
  model: string;
  /** 自定义 Provider 时必填，OpenAI 兼容 baseURL，如 https://openrouter.ai/api/v1 */
  baseUrl?: string;
}

const BUILTIN_ENDPOINTS: Record<'deepseek' | 'openai', string> = {
  deepseek: 'https://api.deepseek.com/v1',
  openai: 'https://api.openai.com/v1',
};

const DEFAULT_MODEL: Record<'deepseek' | 'openai', string> = {
  deepseek: 'deepseek-chat',
  openai: 'gpt-4o-mini',
};

export function getDefaultModel(p: 'deepseek' | 'openai' | 'custom') {
  return DEFAULT_MODEL[p as 'deepseek' | 'openai'] ?? 'gpt-4o-mini';
}

/**
 * 获取 LLM 客户端。始终返回 OpenAI SDK 实例，因为 DeepSeek / OpenRouter / 硅基流动
 * 等都兼容 OpenAI 协议。
 */
function getClient(opts: LlmOptions): OpenAI {
  const baseURL =
    opts.provider === 'custom'
      ? opts.baseUrl || 'https://api.openai.com/v1'
      : BUILTIN_ENDPOINTS[opts.provider];
  return new OpenAI({ apiKey: opts.apiKey, baseURL });
}

export async function chatCompletion(
  opts: LlmOptions,
  messages: LlmMessage[],
  extra: { json?: boolean; temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const client = getClient(opts);
  const res = await client.chat.completions.create({
    model: opts.model,
    messages,
    temperature: extra.temperature ?? 0.5,
    max_tokens: extra.maxTokens ?? 2048,
    response_format: extra.json ? { type: 'json_object' } : undefined,
  });
  return res.choices[0].message.content ?? '';
}

export async function streamChat(
  opts: LlmOptions,
  messages: LlmMessage[],
): Promise<AsyncIterable<string>> {
  const client = getClient(opts);
  const stream = await client.chat.completions.create({
    model: opts.model,
    messages,
    stream: true,
  });
  async function* gen() {
    for await (const chunk of stream) {
      yield chunk.choices[0]?.delta?.content ?? '';
    }
  }
  return gen();
}

/** 测活：检查 API Key + baseURL 是否可用 */
export async function pingLLM(opts: LlmOptions): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = getClient(opts);
    const res = await client.chat.completions.create({
      model: opts.model,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 5,
    });
    if (res.choices[0]?.message?.content !== undefined) return { ok: true };
    return { ok: false, error: '模型无响应' };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}