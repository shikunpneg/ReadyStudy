'use server';

import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { encryptApiKey } from '@/lib/crypto';

const schema = z.object({
  llmProvider: z.enum(['deepseek', 'openai']),
  modelName: z.string().min(1).max(64),
  embedModelName: z.string().min(1).max(64),
  apiKey: z.string().min(1).max(200).optional(),
});

export async function saveSettingsAction(input: {
  llmProvider: 'deepseek' | 'openai';
  modelName: string;
  embedModelName: string;
  apiKey?: string;
}) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: '未登录' };
  const userId = (session.user as { id: string }).id;

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: '字段不合法' };

  const [exist] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));

  const values = {
    userId,
    llmProvider: parsed.data.llmProvider,
    modelName: parsed.data.modelName,
    embedModelName: parsed.data.embedModelName,
    encryptedApiKey: parsed.data.apiKey ? encryptApiKey(parsed.data.apiKey) : exist?.encryptedApiKey,
    updatedAt: new Date(),
  };

  if (exist) {
    await db.update(userSettings).set(values).where(eq(userSettings.userId, userId));
  } else {
    await db.insert(userSettings).values(values);
  }
  return { ok: true as const };
}