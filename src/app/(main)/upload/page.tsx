'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText } from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!file) return;
    setBusy(true);
    setErr(null);
    setProgress(10);

    const fd = new FormData();
    fd.append('file', file);
    if (title) fd.append('title', title);

    try {
      setProgress(40);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      setProgress(80);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'upload failed');
      setProgress(100);
      router.push(`/materials/${j.materialId}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>上传学习资料</CardTitle>
          <CardDescription>
            支持 PDF / TXT / Markdown / PPTX / DOCX，单文件 ≤ 50MB。上传后会自动解析、向量化。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-10 text-center hover:bg-secondary"
            onClick={() => document.getElementById('file-input')?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) {
                setFile(f);
                if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
              }
            }}
          >
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            {file ? (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                {file.name}（{Math.round(file.size / 1024)} KB）
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">点击选择文件，或拖拽到此处</p>
            )}
            <input
              id="file-input"
              type="file"
              className="hidden"
              accept=".pdf,.txt,.md,.ppt,.pptx,.doc,.docx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">资料标题（可选，默认取文件名）</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {progress > 0 && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          {err && <p className="text-sm text-destructive">{err}</p>}

          <Button className="w-full" disabled={!file || busy} onClick={submit}>
            {busy ? '处理中…' : '开始上传并解析'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}