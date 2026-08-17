'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const schema = z.object({
  name: z.string().min(1).max(40),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export async function registerAction(input: { name: string; email: string; password: string }) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: '字段不合法' };

  const [exist] = await db.select().from(users).where(eq(users.email, parsed.data.email));
  if (exist) return { ok: false as const, error: '该邮箱已注册' };

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
  await db.insert(users).values({
    email: parsed.data.email,
    name: parsed.data.name,
    hashedPassword,
    plan: 'free',
  });
  return { ok: true as const };
}