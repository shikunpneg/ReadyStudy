/**
 * LLM 统一抽象。支持 DeepSeek / OpenAI，统一 chat 接口。
 */
import OpenAI from 'openai';

export type LlmMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface LlmOptions {
  provider: 'deepseek' | 'openai';
  apiKey: string;
  model: string;
}

const ENDPOINTS: Record<'deepseek' | 'openai', string> = {
  deepseek: 'https://api.deepseek.com/v1',
  openai: 'https://api.openai.com/v1',
};

const DEFAULT_MODEL: Record<'deepseek' | 'openai', string> = {
  deepseek: 'deepseek-chat',
  openai: 'gpt-4o-mini',
};

export function getDefaultModel(p: 'deepseek' | 'openai') {
  return DEFAULT_MODEL[p];
}

export async function chatCompletion(
  opts: LlmOptions,
  messages: LlmMessage[],
  extra: { json?: boolean; temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const client = new OpenAI({
    apiKey: opts.apiKey,
    baseURL: ENDPOINTS[opts.provider],
  });
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
  const client = new OpenAI({
    apiKey: opts.apiKey,
    baseURL: ENDPOINTS[opts.provider],
  });
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