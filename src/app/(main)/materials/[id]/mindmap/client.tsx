'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainCircuit } from 'lucide-react';

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
    const res = await fetch('/api/mindmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materialId }),
    });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) setErr(j.error);
    else setTree(j.structure);
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
          <Button onClick={generate} disabled={busy || chunkCount === 0}>
            <BrainCircuit className="mr-2 h-4 w-4" />
            {busy ? '生成中…' : '生成知识导图'}
          </Button>
          {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
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