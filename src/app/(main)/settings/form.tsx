'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveSettingsAction } from './actions';

export function SettingsForm({
  defaultValues,
}: {
  defaultValues: {
    llmProvider: 'deepseek' | 'openai';
    modelName: string;
    embedModelName: string;
    hasKey: boolean;
  };
}) {
  const [provider, setProvider] = useState(defaultValues.llmProvider);
  const [modelName, setModelName] = useState(defaultValues.modelName);
  const [embedModelName, setEmbedModelName] = useState(defaultValues.embedModelName);
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const r = await saveSettingsAction({
      llmProvider: provider,
      modelName,
      embedModelName,
      apiKey: apiKey || undefined,
    });
    setBusy(false);
    setMsg(r.ok ? '已保存' : r.error);
    if (r.ok) setApiKey('');
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Provider</Label>
        <div className="flex gap-2">
          {(['deepseek', 'openai'] as const).map((p) => (
            <Button
              key={p}
              variant={provider === p ? 'default' : 'outline'}
              onClick={() => {
                setProvider(p);
                setModelName(p === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini');
                setEmbedModelName('text-embedding-3-small');
              }}
              type="button"
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">Chat 模型</Label>
        <Input
          id="model"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          placeholder={provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini'}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="embed">Embedding 模型</Label>
        <Input
          id="embed"
          value={embedModelName}
          onChange={(e) => setEmbedModelName(e.target.value)}
          placeholder="text-embedding-3-small"
        />
        <p className="text-xs text-muted-foreground">
          DeepSeek 当前未提供独立 Embedding，复用 OpenAI 兼容接口即可
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="key">
          API Key {defaultValues.hasKey ? '（已配置，留空不修改）' : ''}
        </Label>
        <Input
          id="key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
        />
      </div>

      <Button onClick={save} disabled={busy}>
        {busy ? '保存中…' : '保存'}
      </Button>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
    </div>
  );
}