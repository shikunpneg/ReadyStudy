'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, AlertTriangle } from 'lucide-react';

// Vercel Hobby plan 限制：API route body ≤ 4.5 MB
const MAX_BYTES = 4 * 1024 * 1024; // 4MB（保守，留点余地给 headers/multipart）

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  const oversize = file !== null && file.size > MAX_BYTES;

  function pickFile(f: File | null) {
    setFile(f);
    setErr(null);
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  }

  async function submit() {
    if (!file) return;
    if (oversize) {
      setErr(
        `文件太大（${formatSize(file.size)}），超过 ${formatSize(MAX_BYTES)} 限制。请用 PDF 压缩工具（如 ilovepdf.com）压到 4MB 以内再上传。`,
      );
      return;
    }

    setBusy(true);
    setErr(null);
    setProgress(0);

    const fd = new FormData();
    fd.append('file', file);
    if (title) fd.append('title', title);

    // 用 XMLHttpRequest 以拿到上传进度
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 70));
    };
    xhr.onload = () => {
      setProgress(85);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const j = JSON.parse(xhr.responseText);
          setProgress(100);
          router.push(`/materials/${j.materialId}`);
        } catch {
          setErr('返回数据解析失败');
        }
      } else {
        // 尝试解析错误 JSON
        let msg = `HTTP ${xhr.status}`;
        try {
          const j = JSON.parse(xhr.responseText);
          msg = j.error || msg;
        } catch {}
        setErr(msg);
      }
      setBusy(false);
    };
    xhr.onerror = () => {
      setBusy(false);
      setErr('网络错误，请重试');
    };
    xhr.open('POST', '/api/upload');
    xhr.send(fd);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>上传学习资料</CardTitle>
          <CardDescription>
            支持 PDF / TXT / Markdown / PPTX / DOCX，单文件 ≤ <b>{formatSize(MAX_BYTES)}</b>。上传后自动解析、向量化。
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
              if (f) pickFile(f);
            }}
          >
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            {file ? (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                {file.name}（{formatSize(file.size)}）
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">点击选择文件，或拖拽到此处</p>
            )}
            <input
              id="file-input"
              type="file"
              className="hidden"
              accept=".pdf,.txt,.md,.ppt,.pptx,.doc,.docx"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">资料标题（可选，默认取文件名）</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {oversize && (
            <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">文件超过 {formatSize(MAX_BYTES)} 限制</p>
                <p className="mt-1 text-xs">
                  推荐：使用{' '}
                  <a
                    href="https://www.ilovepdf.com/compress_pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    ilovepdf.com
                  </a>{' '}
                  或{' '}
                  <a
                    href="https://smallpdf.com/compress-pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    smallpdf.com
                  </a>{' '}
                  压缩后重新上传。
                </p>
              </div>
            </div>
          )}

          {progress > 0 && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          {err && <p className="text-sm text-destructive">{err}</p>}

          <Button className="w-full" disabled={!file || busy || oversize} onClick={submit}>
            {busy ? '处理中…' : '开始上传并解析'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}