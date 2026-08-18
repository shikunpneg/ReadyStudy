import { auth } from '@/lib/auth';
import { requireUser } from '@/lib/guards';
import { db } from '@/lib/db';
import { userSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SettingsForm } from './form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Provider = 'deepseek' | 'openai' | 'custom';

export default async function SettingsPage() {
  const user = await requireUser();
  const userId = user.id;
  const [s] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">设置</h1>

      <Card>
        <CardHeader>
          <CardTitle>AI 模型（BYOK）</CardTitle>
          <CardDescription>
            您的 API Key 会被 AES-256-GCM 加密后存储，仅在出题/embedding 时使用。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            defaultValues={{
              llmProvider: (s?.llmProvider as Provider) ?? 'deepseek',
              modelName: s?.modelName ?? 'deepseek-chat',
              embedModelName: s?.embedModelName ?? 'text-embedding-3-small',
              baseUrl: s?.baseUrl ?? null,
              hasKey: Boolean(s?.encryptedApiKey),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}