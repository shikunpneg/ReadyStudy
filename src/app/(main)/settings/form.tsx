'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveSettingsAction, pingAction } from './actions';

type Provider = 'deepseek' | 'openai' | 'custom';

const PRESETS: Record<Exclude<Provider, 'custom'>, { model: string; embedModel: string }> = {
  deepseek: { model: 'deepseek-chat', embedModel: 'text-embedding-3-small' },
  openai: { model: 'gpt-4o-mini', embedModel: 'text-embedding-3-small' },
};

export function SettingsForm({
  defaultValues,
}: {
  defaultValues: {
    llmProvider: Provider;
    modelName: string;
    embedModelName: string;
    baseUrl: string | null;
    hasKey: boolean;
  };
}) {
  const [provider, setProvider] = useState<Provider>(defaultValues.llmProvider);
  const [modelName, setModelName] = useState(defaultValues.modelName);
  const [embedModelName, setEmbedModelName] = useState(defaultValues.embedModelName);
  const [baseUrl, setBaseUrl] = useState(defaultValues.baseUrl ?? '');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function switchProvider(p: Provider) {
    setProvider(p);
    if (p !== 'custom') {
      setModelName(PRESETS[p].model);
      setEmbedModelName(PRESETS[p].embedModel);
      setBaseUrl('');
    }
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const r = await saveSettingsAction({
      llmProvider: provider,
      modelName,
      embedModelName,
      baseUrl: baseUrl || null,
      apiKey: apiKey || undefined,
    });
    setBusy(false);
    setMsg(r.ok ? '已保存' : r.error);
    if (r.ok) setApiKey('');
  }

  async function test() {
    setTesting(true);
    setMsg(null);
    const r = await pingAction({
      llmProvider: provider,
      modelName,
      baseUrl: baseUrl || null,
      apiKey: apiKey || undefined, // 用刚填的 key，否则用已保存的
    });
    setTesting(false);
    setMsg(r.ok ? '✓ 模型响应正常' : `✗ ${r.error}`);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Provider</Label>
        <div className="flex flex-wrap gap-2">
          {(['deepseek', 'openai', 'custom'] as const).map((p) => (
            <Button
              key={p}
              variant={provider === p ? 'default' : 'outline'}
              onClick={() => switchProvider(p)}
              type="button"
            >
              {p === 'deepseek' ? 'DeepSeek' : p === 'openai' ? 'OpenAI' : '自定义（OpenAI 兼容）'}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          自定义可填 OpenRouter / 硅基流动 / OneAPI / 自建 Ollama / 任意 OpenAI 兼容服务。
        </p>
      </div>

      {provider === 'custom' && (
        <div className="space-y-2">
          <Label htmlFor="baseurl">Base URL</Label>
          <Input
            id="baseurl"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://openrouter.ai/api/v1"
          />
          <p className="text-xs text-muted-foreground">
            OpenAI 兼容协议的根地址（末尾通常带 <code>/v1</code>）
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="model">Chat 模型</Label>
        <Input
          id="model"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          placeholder={provider === 'deepseek' ? 'deepseek-chat' : provider === 'openai' ? 'gpt-4o-mini' : '模型名'}
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
          若自定义服务不支持 Embedding，可留空并降级为关键词检索。
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

      <div className="flex gap-2">
        <Button onClick={save} disabled={busy || testing}>
          {busy ? '保存中…' : '保存'}
        </Button>
        <Button variant="outline" onClick={test} disabled={busy || testing}>
          {testing ? '测试中…' : '测活'}
        </Button>
      </div>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
    </div>
  );
}