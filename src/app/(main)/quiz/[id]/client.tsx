'use client';

import { useState } from 'react';
import type { QuestionType } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { QUESTION_TYPE_LABEL } from '@/lib/ai/prompts';

interface Q {
  id: string;
  type: QuestionType;
  difficulty: string;
  content: string;
  options: Record<string, string> | null;
  answer: unknown;
  explanation: string | null;
}

export function SingleQuiz({ question }: { question: Q }) {
  const q = question;
  const [userAnswer, setUserAnswer] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    | { isCorrect: boolean; score: number; feedback?: string }
    | null
  >(null);

  async function submit() {
    if (userAnswer === null || userAnswer === '') return;
    setSubmitting(true);
    const res = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: q.id, userAnswer }),
    });
    const j = await res.json();
    setSubmitting(false);
    if (res.ok) setResult(j);
    else alert(j.error || '提交失败');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="rounded bg-secondary px-2 py-0.5">
          {QUESTION_TYPE_LABEL[q.type]}
        </span>
      </div>

      <h1 className="text-lg font-medium">{q.content}</h1>

      <AnswerInput
        type={q.type}
        options={q.options}
        value={userAnswer}
        onChange={setUserAnswer}
        disabled={!!result}
      />

      {result ? (
        <div
          className={`rounded-md p-4 text-sm ${
            result.isCorrect ? 'bg-primary-50 text-primary-700' : 'bg-red-50 text-red-700'
          }`}
        >
          <p className="font-medium">
            {result.isCorrect ? '✓ 正确' : '✗ 错误'}（{result.score} 分）
          </p>
          {result.feedback && (
            <p className="mt-2 whitespace-pre-wrap">{result.feedback}</p>
          )}
          {q.explanation && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs underline">查看解析</summary>
              <p className="mt-1 text-xs">{q.explanation}</p>
            </details>
          )}
        </div>
      ) : (
        <Button onClick={submit} disabled={submitting || userAnswer === null}>
          {submitting ? '评判中…' : '提交答案'}
        </Button>
      )}
    </div>
  );
}

function AnswerInput({
  type,
  options,
  value,
  onChange,
  disabled,
}: {
  type: QuestionType;
  options: Record<string, string> | null;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
}) {
  if (type === 'single' && options) {
    return (
      <div className="space-y-2">
        {Object.entries(options).map(([k, v]) => (
          <label
            key={k}
            className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 ${
              value === k ? 'border-primary bg-primary-50' : ''
            }`}
          >
            <input
              type="radio"
              disabled={disabled}
              checked={value === k}
              onChange={() => onChange(k)}
              className="mt-1"
            />
            <span>
              <b>{k}.</b> {v}
            </span>
          </label>
        ))}
      </div>
    );
  }
  if (type === 'multiple' && options) {
    const current = (value as string[]) ?? [];
    return (
      <div className="space-y-2">
        {Object.entries(options).map(([k, v]) => (
          <label
            key={k}
            className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 ${
              current.includes(k) ? 'border-primary bg-primary-50' : ''
            }`}
          >
            <input
              type="checkbox"
              disabled={disabled}
              checked={current.includes(k)}
              onChange={(e) => {
                const next = e.target.checked
                  ? [...current, k]
                  : current.filter((x) => x !== k);
                onChange(next);
              }}
              className="mt-1"
            />
            <span>
              <b>{k}.</b> {v}
            </span>
          </label>
        ))}
      </div>
    );
  }
  if (type === 'judge') {
    return (
      <div className="flex gap-2">
        {[
          { v: 'true', l: '✓ 正确' },
          { v: 'false', l: '✗ 错误' },
        ].map((o) => (
          <Button
            key={o.v}
            variant={value === o.v ? 'default' : 'outline'}
            disabled={disabled}
            onClick={() => onChange(o.v)}
          >
            {o.l}
          </Button>
        ))}
      </div>
    );
  }
  if (type === 'fill') {
    return (
      <input
        disabled={disabled}
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="在此填写答案"
        className="w-full rounded-md border px-3 py-2"
      />
    );
  }
  return (
    <textarea
      disabled={disabled}
      rows={6}
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="请在此作答…"
      className="w-full rounded-md border px-3 py-2"
    />
  );
}