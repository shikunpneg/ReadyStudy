'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Highlighter, PencilLine, Trash2, Save, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

type MaterialType = 'pdf' | 'html' | 'md' | 'txt' | 'epub' | 'mobi' | 'pptx' | 'docx';

interface Note {
  id: string;
  highlightText: string | null;
  content: string;
  kind: string;
  createdAt: string;
}

interface FallbackChunk {
  id: string;
  content: string;
}

interface Props {
  materialId: string;
  type: MaterialType;
  title: string;
  hasOriginal: boolean;
  notes: Note[];
  fallbackChunks: FallbackChunk[];
}

export function ReaderClient({
  materialId,
  type,
  title,
  hasOriginal,
  notes,
  fallbackChunks,
}: Props) {
  if (type === 'pdf') {
    return hasOriginal ? (
      <PdfReader materialId={materialId} title={title} initialNotes={notes} />
    ) : (
      <FallbackReader materialId={materialId} title={title} chunks={fallbackChunks} notes={notes} />
    );
  }

  if (type === 'html' || type === 'md' || type === 'txt') {
    return hasOriginal ? (
      <HtmlLikeReader materialId={materialId} title={title} type={type} initialNotes={notes} />
    ) : (
      <FallbackReader materialId={materialId} title={title} chunks={fallbackChunks} notes={notes} />
    );
  }

  return <FallbackReader materialId={materialId} title={title} chunks={fallbackChunks} notes={notes} />;
}

/* ============ PDF 阅读器（pdf.js 浏览器渲染 + 划线） ============ */

function PdfReader({ materialId, title, initialNotes }: { materialId: string; title: string; initialNotes: Note[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [pendingSelection, setPendingSelection] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs: any = await import('pdfjs-dist/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc =
          'https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
        (window as any).__pdfjsUtil = pdfjs.Util;

        const res = await fetch(`/api/materials/${materialId}/file`);
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        const data = await res.arrayBuffer();
        const doc = await pdfjs.getDocument({ data }).promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setBusy(false);
      } catch (e) {
        if (cancelled) return;
        setErr(`PDF 加载失败：${(e as Error).message}`);
        setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [materialId]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !textLayerRef.current) return;
    (async () => {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      await page.render({ canvasContext: ctx, viewport }).promise;

      // 文本层（用于选区）
      const textContent = await page.getTextContent();
      const textLayer = textLayerRef.current!;
      textLayer.innerHTML = '';
      textLayer.style.width = `${viewport.width}px`;
      textLayer.style.height = `${viewport.height}px`;

      const frag = document.createDocumentFragment();
      for (const item of textContent.items as any[]) {
        const span = document.createElement('span');
        span.textContent = item.str;
        if (item.hasEOL) span.style.display = 'block';
        const tx = (window as any).__pdfjsUtil.transform(viewport.transform, item.transform);
        span.style.position = 'absolute';
        span.style.left = `${tx[4]}px`;
        span.style.top = `${tx[5] - item.height * tx[0]}px`;
        span.style.fontSize = `${item.height * tx[0]}px`;
        frag.appendChild(span);
      }
      textLayer.appendChild(frag);
    })();
  }, [pdfDoc, pageNum, scale]);

  function captureSelection() {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? '';
    if (text.length > 0) setPendingSelection(text);
  }

  async function saveHighlight() {
    if (!pendingSelection) return;
    const note = prompt('为这段划线添加注释（可选）：', '') ?? '';
    const r = await fetch(`/api/materials/${materialId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'highlight',
        highlightText: pendingSelection,
        content: note,
      }),
    });
    if (r.ok) {
      const j = await r.json();
      setNotes((n) => [...n, { ...j, createdAt: new Date().toISOString() }]);
      setPendingSelection('');
    } else {
      alert('保存失败');
    }
  }

  async function delNote(id: string) {
    await fetch(`/api/materials/${materialId}/notes/${id}`, { method: 'DELETE' });
    setNotes((n) => n.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card p-3 text-sm">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setPageNum((p) => Math.max(1, p - 1))} disabled={pageNum <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>
            第{' '}
            <input
              type="number"
              value={pageNum}
              min={1}
              max={totalPages}
              onChange={(e) => setPageNum(Math.max(1, Math.min(totalPages, Number(e.target.value))))}
              className="w-14 rounded border px-2 py-0.5 text-center"
            />{' '}
            / {totalPages || '?'} 页
          </span>
          <Button size="sm" variant="outline" onClick={() => setPageNum((p) => Math.min(totalPages, p + 1))} disabled={pageNum >= totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button size="sm" variant="outline" onClick={() => setScale((s) => Math.min(3, s + 0.2))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={captureSelection}>
            <Highlighter className="mr-1 h-4 w-4" /> 划线
          </Button>
        </div>
      </div>

      {pendingSelection && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm">
          <div className="flex-1">
            <p className="text-xs text-yellow-800">
              已选：「{pendingSelection.slice(0, 80)}
              {pendingSelection.length > 80 ? '…' : ''}」
            </p>
          </div>
          <Button size="sm" onClick={saveHighlight}>
            <Save className="mr-1 h-4 w-4" /> 保存
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPendingSelection('')}>
            取消
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {busy ? (
            <p className="p-6 text-center text-sm text-muted-foreground">PDF 加载中…</p>
          ) : err ? (
            <p className="p-6 text-center text-sm text-destructive">{err}</p>
          ) : (
            <div className="relative mx-auto overflow-auto bg-secondary p-4" style={{ maxHeight: '70vh' }}>
              <canvas ref={canvasRef} className="block shadow-md" />
              <div ref={textLayerRef} className="absolute left-0 top-0" />
            </div>
          )}
        </CardContent>
      </Card>

      <NotesList notes={notes} onDelete={delNote} />
    </div>
  );
}

/* ============ HTML / Markdown 阅读器 ============ */

function HtmlLikeReader({
  materialId,
  title,
  type,
  initialNotes,
}: {
  materialId: string;
  title: string;
  type: 'html' | 'md' | 'txt';
  initialNotes: Note[];
}) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [html, setHtml] = useState<string>('');
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [pendingSelection, setPendingSelection] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/materials/${materialId}/file`);
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        const buf = await res.arrayBuffer();
        const raw = new TextDecoder('utf-8').decode(buf);
        if (cancelled) return;
        setHtml(renderMarkdownOrHtml(raw, type));
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setErr((e as Error).message);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [materialId, type]);

  function captureSelection() {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? '';
    if (text.length > 0) setPendingSelection(text);
  }

  async function saveHighlight(note = '') {
    if (!pendingSelection) return;
    const r = await fetch(`/api/materials/${materialId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'highlight',
        highlightText: pendingSelection,
        content: note,
      }),
    });
    if (r.ok) {
      const j = await r.json();
      setNotes((n) => [...n, { ...j, createdAt: new Date().toISOString() }]);
      setPendingSelection('');
    }
  }

  async function delNote(id: string) {
    await fetch(`/api/materials/${materialId}/notes/${id}`, { method: 'DELETE' });
    setNotes((n) => n.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2 text-sm">
        <Button size="sm" variant="outline" onClick={captureSelection}>
          <Highlighter className="mr-1 h-4 w-4" /> 划线选区
        </Button>
      </div>

      {pendingSelection && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm">
          <div className="flex-1">
            <p className="text-xs text-yellow-800">
              已选：「{pendingSelection.slice(0, 100)}
              {pendingSelection.length > 100 ? '…' : ''}」
            </p>
          </div>
          <Button size="sm" onClick={() => saveHighlight(prompt('为这段划线添加注释（可选）：', '') ?? '')}>
            <Save className="mr-1 h-4 w-4" /> 保存
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPendingSelection('')}>
            取消
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">加载中…</p>
          ) : err ? (
            <p className="p-6 text-center text-sm text-destructive">{err}</p>
          ) : (
            <div
              ref={contentRef}
              className="prose prose-slate dark:prose-invert max-w-none p-8 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:my-3 [&_p]:leading-7 [&_ul]:my-3 [&_ol]:my-3 [&_li]:my-1 [&_code]:bg-secondary [&_code]:px-1 [&_code]:rounded [&_pre]:bg-secondary [&_pre]:p-4 [&_pre]:rounded-md [&_pre]:overflow-auto [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_img]:rounded [&_table]:border-collapse [&_th]:border [&_td]:border [&_th]:p-2 [&_td]:p-2"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </CardContent>
      </Card>

      <NotesList notes={notes} onDelete={delNote} />
    </div>
  );
}

/* ============ 笔记列表 ============ */

function NotesList({ notes, onDelete }: { notes: Note[]; onDelete: (id: string) => void }) {
  if (notes.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">笔记（{notes.length}）</CardTitle>
        <CardDescription>划线与自由笔记</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {notes.map((n) => (
          <div key={n.id} className="rounded-md border p-3 text-sm">
            {n.kind === 'highlight' && n.highlightText && (
              <div className="mb-1 rounded bg-yellow-100 px-2 py-1 text-xs">
                <Highlighter className="mr-1 inline h-3 w-3" />
                「{n.highlightText.slice(0, 100)}{n.highlightText.length > 100 ? '…' : ''}」
              </div>
            )}
            {n.content && (
              <p className="whitespace-pre-wrap text-sm">
                <PencilLine className="mr-1 inline h-3 w-3 text-muted-foreground" />
                {n.content}
              </p>
            )}
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{new Date(n.createdAt).toLocaleString('zh-CN')}</span>
              <Button size="sm" variant="ghost" onClick={() => onDelete(n.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ============ Fallback（无原始文件） ============ */

function FallbackReader({
  materialId,
  title,
  chunks,
  notes,
}: {
  materialId: string;
  title: string;
  chunks: { id: string; content: string }[];
  notes: Note[];
}) {
  const [freeNote, setFreeNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function saveNote() {
    if (!freeNote.trim()) return;
    setBusy(true);
    const r = await fetch(`/api/materials/${materialId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'free', content: freeNote }),
    });
    setBusy(false);
    if (r.ok) location.reload();
  }

  async function delNote(id: string) {
    await fetch(`/api/materials/${materialId}/notes/${id}`, { method: 'DELETE' });
    location.reload();
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">纯文本阅读</CardTitle>
          <CardDescription>
            本资料未保留原始文件（早期上传或非 PDF/HTML/MD）。展示解析后的纯文本版本。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {chunks.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无内容</p>
          ) : (
            <div className="space-y-4">
              {chunks.map((c) => (
                <p key={c.id} className="whitespace-pre-wrap leading-7 text-sm">
                  {c.content}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">添加笔记</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={freeNote}
            onChange={(e) => setFreeNote(e.target.value)}
            placeholder="写下你的笔记…"
            rows={4}
          />
          <Button onClick={saveNote} disabled={busy || !freeNote.trim()}>
            保存笔记
          </Button>
        </CardContent>
      </Card>

      <NotesList notes={notes} onDelete={delNote} />
    </div>
  );
}

/* ============ Markdown/HTML 渲染 ============ */

function renderMarkdownOrHtml(raw: string, type: 'html' | 'md' | 'txt'): string {
  if (type === 'html') {
    return sanitizeHtml(raw);
  }
  if (type === 'md') {
    return mdToHtml(raw);
  }
  return `<pre style="white-space: pre-wrap; font-family: ui-monospace, monospace;">${escapeHtml(raw)}</pre>`;
}

function sanitizeHtml(html: string): string {
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
  html = html.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  html = html.replace(/\son\w+="[^"]*"/gi, '');
  html = html.replace(/\son\w+='[^']*'/gi, '');
  return html;
}

function mdToHtml(md: string): string {
  md = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => `<pre><code>${escapeHtml(code.trim())}</code></pre>`);
  md = md.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  md = md.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  md = md.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  md = md.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  md = md.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  md = md.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  md = md.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  md = md.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  md = md.replace(/`([^`]+)`/g, '<code>$1</code>');
  md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  md = md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />');
  md = md.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
  md = md.replace(/^[-*+]\s+(.+)$/gm, '<li>$1</li>');
  md = md.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  md = md.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  md = md.replace(/^[-*_]{3,}\s*$/gm, '<hr/>');
  md = md.replace(/\n\n+/g, '</p><p>');
  md = `<p>${md}</p>`;
  md = md.replace(/<p><(h\d|ul|ol|pre|blockquote|hr)/g, '<$1');
  md = md.replace(/<\/(h\d|ul|ol|pre|blockquote|hr)><\/p>/g, '</$1>');
  return md;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}