'use server';

import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { encryptApiKey, decryptApiKey } from '@/lib/crypto';
import { pingLLM } from '@/lib/ai/llm';

const providerSchema = z.enum(['deepseek', 'openai', 'custom']);

const saveSchema = z.object({
  llmProvider: providerSchema,
  modelName: z.string().min(1).max(128),
  embedModelName: z.string().min(1).max(128),
  baseUrl: z.string().max(512).nullable().optional(),
  apiKey: z.string().min(1).max(500).optional(),
});

const pingSchema = z.object({
  llmProvider: providerSchema,
  modelName: z.string().min(1).max(128),
  baseUrl: z.string().max(512).nullable().optional(),
  apiKey: z.string().min(1).max(500).optional(),
});

export async function saveSettingsAction(input: {
  llmProvider: 'deepseek' | 'openai' | 'custom';
  modelName: string;
  embedModelName: string;
  baseUrl?: string | null;
  apiKey?: string;
}) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: '未登录' };
  const userId = (session.user as { id: string }).id;

  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: '字段不合法' };

  const [exist] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));

  const values = {
    userId,
    llmProvider: parsed.data.llmProvider,
    modelName: parsed.data.modelName,
    embedModelName: parsed.data.embedModelName,
    baseUrl: parsed.data.baseUrl || null,
    encryptedApiKey: parsed.data.apiKey
      ? encryptApiKey(parsed.data.apiKey)
      : exist?.encryptedApiKey,
    updatedAt: new Date(),
  };

  if (exist) {
    await db.update(userSettings).set(values).where(eq(userSettings.userId, userId));
  } else {
    await db.insert(userSettings).values(values);
  }
  return { ok: true as const };
}

export async function pingAction(input: {
  llmProvider: 'deepseek' | 'openai' | 'custom';
  modelName: string;
  baseUrl?: string | null;
  apiKey?: string;
}) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: '未登录' };
  const userId = (session.user as { id: string }).id;

  const parsed = pingSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: '字段不合法' };

  // 若用户没填新 key，用已保存的（解密）
  let apiKey = parsed.data.apiKey;
  if (!apiKey) {
    const [s] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    if (!s?.encryptedApiKey) return { ok: false as const, error: '尚未配置 API Key' };
    apiKey = decryptApiKey(s.encryptedApiKey);
  }

  const result = await pingLLM({
    provider: parsed.data.llmProvider,
    apiKey,
    model: parsed.data.modelName,
    baseUrl: parsed.data.baseUrl ?? undefined,
  });
  return result.ok
    ? { ok: true as const }
    : { ok: false as const, error: result.error ?? '未知错误' };
}