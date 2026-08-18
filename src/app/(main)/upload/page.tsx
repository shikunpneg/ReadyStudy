'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';

// Vercel Hobby plan 限制：API route body ≤ 4.5 MB
// PDF 服务端会自动压缩（pdf-lib），压缩后仍超限才报错
const MAX_BYTES = 4 * 1024 * 1024; // 4MB

const ACCEPTED_FORMATS = ['.pdf', '.txt', '.md', '.ppt', '.pptx', '.doc', '.docx', '.epub', '.mobi', '.azw', '.azw3'];

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{
    compressed: boolean;
    originalSizeMB: number;
    finalSizeMB: number;
    chunkCount: number;
  } | null>(null);

  const oversize = file !== null && file.size > MAX_BYTES;

  function pickFile(f: File | null) {
    setFile(f);
    setErr(null);
    setResult(null);
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  }

  async function submit() {
    if (!file) return;
    setBusy(true);
    setErr(null);
    setResult(null);
    setProgress(0);

    const fd = new FormData();
    fd.append('file', file);
    if (title) fd.append('title', title);

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
          setResult({
            compressed: !!j.compressed,
            originalSizeMB: j.originalSizeMB,
            finalSizeMB: j.finalSizeMB,
            chunkCount: j.chunkCount,
          });
          // 1.5 秒后跳转
          setTimeout(() => router.push(`/materials/${j.materialId}`), 1200);
        } catch {
          setErr('返回数据解析失败');
        }
      } else {
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
            支持 <b>PDF / TXT / Markdown / PPTX / DOCX / EPUB / MOBI / AZW3</b>。
            单文件 ≤ {formatSize(MAX_BYTES)}，PDF 会自动服务端压缩。上传后自动解析、向量化。
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
              accept={ACCEPTED_FORMATS.join(',')}
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
                <p className="font-medium">
                  文件 {formatSize(file.size)} 超过 4MB · PDF 会自动服务端压缩
                </p>
                <p className="mt-1 text-xs">
                  其他格式请用{' '}
                  <a
                    href="https://www.ilovepdf.com/compress_pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    ilovepdf
                  </a>{' '}
                  压缩，或转 TXT/Markdown 上传。
                </p>
              </div>
            </div>
          )}

          {result && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">上传成功，正在跳转…</span>
              </div>
              <ul className="mt-2 space-y-0.5 text-xs">
                <li>原大小：{result.originalSizeMB} MB</li>
                {result.compressed && <li>压缩后：{result.finalSizeMB} MB</li>}
                <li>解析为 {result.chunkCount} 个文本块</li>
              </ul>
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

          <Button className="w-full" disabled={!file || busy} onClick={submit}>
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