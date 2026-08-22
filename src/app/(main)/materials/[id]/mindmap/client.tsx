'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainCircuit, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import type { Tree, TreeNode } from './types';

export function MindmapClient({
  materialId,
  initial,
  chunkCount,
}: {
  materialId: string;
  initial: Tree | null;
  chunkCount: number;
}) {
  const [tree, setTree] = useState<Tree | null>(initial);
  const [source, setSource] = useState<'native' | 'llm' | null>(initial ? 'native' : null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate(forceLLM = false) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId, forceLLM }),
      });
      const j = await res.json();
      if (!res.ok) {
        setErr(j.error || `HTTP ${res.status}`);
      } else {
        setTree(j.structure);
        setSource(j.source);
      }
    } catch (e) {
      setErr(`网络错误：${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (chunkCount === 0 && !tree) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>暂无文本块</CardTitle>
          <CardDescription>
            资料还没解析出文本块（可能正在解析中，或解析失败）。请刷新页面重试。
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!tree) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>知识导图</CardTitle>
          <CardDescription>
            将使用资料原生的章节结构（如 PDF 书签 / EPUB spine / Markdown 标题）。
            当前资料有 {chunkCount} 个文本块。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => generate()} disabled={busy}>
            <BrainCircuit className="mr-2 h-4 w-4" />
            {busy ? '生成中（30-60 秒）…' : '生成思维导图'}
          </Button>
          {err && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">生成失败</p>
                <p className="mt-1 text-xs">{err}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {source === 'native' ? (
            <span className="rounded bg-primary-50 px-2 py-0.5 text-primary-700">
              📑 原文章节结构
            </span>
          ) : (
            <span className="rounded bg-secondary px-2 py-0.5">🤖 LLM 生成</span>
          )}
        </div>
        <div className="flex gap-2">
          {source === 'native' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => generate(true)}
              disabled={busy}
            >
              <Sparkles className="mr-1 h-4 w-4" /> 用 AI 重生成
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => generate(source === 'native')}
            disabled={busy}
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            {busy ? '生成中…' : '刷新'}
          </Button>
        </div>
      </div>
      <TreeView node={tree} level={0} />
      {err && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">上次刷新失败</p>
            <p className="mt-1 text-xs">{err}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TreeView({ node, level }: { node: Tree | TreeNode; level: number }) {
  const isRoot = level === 0;
  const title = isRoot ? (node as Tree).title : (node as TreeNode).title;
  const page = !isRoot ? (node as TreeNode).page : undefined;

  return (
    <div className={isRoot ? '' : 'ml-4 border-l pl-4'}>
      <div
        className={`mb-1 inline-flex items-center gap-2 rounded px-2 py-1 text-sm ${
          isRoot ? 'bg-primary text-primary-foreground' : 'bg-secondary'
        }`}
      >
        <span>{title}</span>
        {page && (
          <span className="rounded bg-background/80 px-1.5 py-0.5 text-xs text-muted-foreground">
            p.{page}
          </span>
        )}
      </div>
      {(node as Tree | TreeNode).children?.map((c, i) => (
        <TreeView key={i} node={c} level={level + 1} />
      ))}
    </div>
  );
}