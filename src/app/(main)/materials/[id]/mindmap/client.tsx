'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainCircuit, AlertCircle } from 'lucide-react';

interface TreeNode {
  title: string;
  children?: TreeNode[];
}

interface Tree {
  root: string;
  children: TreeNode[];
}

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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId }),
      });
      const j = await res.json();
      if (!res.ok) {
        setErr(j.error || `HTTP ${res.status}`);
      } else {
        setTree(j.structure);
      }
    } catch (e) {
      setErr(`网络错误：${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (chunkCount === 0) {
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
          <CardTitle>还没有导图</CardTitle>
          <CardDescription>
            当前资料有 {chunkCount} 个文本块，点击生成。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={generate} disabled={busy}>
            <BrainCircuit className="mr-2 h-4 w-4" />
            {busy ? '生成中（可能需要 30-60 秒）…' : '生成知识导图'}
          </Button>
          {err && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">生成失败</p>
                <p className="mt-1 text-xs">{err}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  常见原因：API Key 失效 / 余额不足 / 模型名称错误。请到设置页检查。
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={generate} disabled={busy}>
          {busy ? '重新生成中…' : '重新生成'}
        </Button>
      </div>
      <TreeView node={tree} level={0} />
      {err && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">上次重新生成失败</p>
            <p className="mt-1 text-xs">{err}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TreeView({ node, level }: { node: Tree | TreeNode; level: number }) {
  const isRoot = level === 0;
  return (
    <div className={isRoot ? '' : 'ml-4 border-l pl-4'}>
      <div
        className={`mb-1 inline-block rounded px-2 py-1 text-sm ${
          isRoot ? 'bg-primary text-primary-foreground' : 'bg-secondary'
        }`}
      >
        {isRoot ? (node as Tree).root : (node as TreeNode).title}
      </div>
      {(node as Tree | TreeNode).children?.map((c, i) => (
        <TreeView key={i} node={c} level={level + 1} />
      ))}
    </div>
  );
}