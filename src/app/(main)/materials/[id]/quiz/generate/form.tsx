'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { QuestionType } from '@/lib/db/schema';
import { QUESTION_TYPE_LABEL } from '@/lib/ai/prompts';

const TYPES: QuestionType[] = ['single', 'multiple', 'judge', 'fill', 'short', 'define', 'essay'];

export function GenerateForm({ materialId }: { materialId: string }) {
  const router = useRouter();
  const [type, setType] = useState<QuestionType>('single');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/quiz/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        materialId,
        type,
        count,
        difficulty,
        topicHint: topic || undefined,
      }),
    });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(j.error || '生成失败');
      return;
    }
    router.push(`/materials/${materialId}/quiz`);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>题型</Label>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <Button
              key={t}
              type="button"
              variant={type === t ? 'default' : 'outline'}
              size="sm"
              onClick={() => setType(t)}
            >
              {QUESTION_TYPE_LABEL[t]}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>数量</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>难度</Label>
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <Button
                key={d}
                type="button"
                variant={difficulty === d ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDifficulty(d)}
              >
                {d === 'easy' ? '易' : d === 'medium' ? '中' : '难'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>主题/章节提示（可选）</Label>
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="留空则覆盖全资料"
        />
      </div>

      {err && <p className="text-sm text-destructive">{err}</p>}

      <Button onClick={submit} disabled={busy} className="w-full">
        {busy ? '生成中…' : '生成'}
      </Button>
    </div>
  );
}