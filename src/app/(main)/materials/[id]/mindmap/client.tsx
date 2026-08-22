'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  BrainCircuit,
  AlertCircle,
  Search,
  X,
  RefreshCw,
  BookMarked,
  Highlighter,
} from 'lucide-react';
import type { KGData, KGStats, KGEntity } from '@/lib/kg/types';

interface Props {
  materialId: string;
  materialTitle: string;
  initialData: KGData | null;
  initialStats: KGStats | null;
  initialFullText: string | null;
}

/**
 * 三视图知识图谱阅读器 —— 移植自 fast_read_book
 *  左侧：实体列表（搜索）+ 原文阅读
 *  中间：markmap 思维导图
 *  下方/浮层：实体详情（定义 / AI 理解 / 原文段落 / 相关实体）
 */
export function MindmapClient({
  materialId,
  materialTitle,
  initialData,
  initialStats,
  initialFullText,
}: Props) {
  const [data, setData] = useState<KGData | null>(initialData);
  const [stats, setStats] = useState<KGStats | null>(initialStats);
  const [fullText, setFullText] = useState<string | null>(initialFullText);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'list' | 'text'>('list');

  async function build(force = false) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/materials/${materialId}/kg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(force ? { force: true } : {}),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setData(j.data);
      setStats(j.stats);
      setFullText(j.fullText);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>知识图谱</CardTitle>
          <CardDescription>
            使用 fast_read_book 的引擎：提取章节标题 + 参考文献作为实体，自动构建定义、段落与关系图谱。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => build()} disabled={busy}>
            <BrainCircuit className="mr-2 h-4 w-4" />
            {busy ? '构建中（30-60 秒）…' : '构建知识图谱'}
          </Button>
          {err && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">构建失败</p>
                <p className="mt-1 text-xs">{err}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const entities = Object.values(data);
  const filtered = search
    ? entities.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : entities;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* ===== 左侧：实体列表 ===== */}
      <div className="space-y-3">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">知识图谱实体</CardTitle>
              <span className="text-xs text-muted-foreground">
                {stats?.total_entities ?? entities.length} 个实体
              </span>
            </div>
            <CardDescription>
              关系 {stats?.total_relations ?? 0} · 定义 {stats?.with_definition ?? 0}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={tab === 'list' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setTab('list')}
              >
                实体列表
              </Button>
              <Button
                size="sm"
                variant={tab === 'text' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setTab('text')}
              >
                原文阅读
              </Button>
            </div>

            {tab === 'list' ? (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜索实体…"
                    className="pl-8"
                  />
                </div>
                <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
                  {filtered.map((e) => (
                    <button
                      key={e.name}
                      onClick={() => setSelected(e.name)}
                      className={`block w-full rounded-md px-2 py-1.5 text-left text-sm transition ${
                        selected === e.name
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-secondary'
                      }`}
                    >
                      <span className="line-clamp-1">{e.name}</span>
                      {e.is_reference && (
                        <span className="ml-1 text-[10px] opacity-60">📄引用</span>
                      )}
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      无匹配实体
                    </p>
                  )}
                </div>
              </>
            ) : (
              <FullTextView fullText={fullText} highlight={selected} onSelect={setSelected} />
            )}

            <div className="flex gap-2 border-t pt-3">
              <Button size="sm" variant="outline" onClick={() => build(true)} disabled={busy}>
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                重新构建
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setTab('text')}>
                <BookMarked className="mr-1 h-3.5 w-3.5" />
                原文
              </Button>
            </div>
            {err && <p className="text-xs text-destructive">{err}</p>}
          </CardContent>
        </Card>
      </div>

      {/* ===== 中间：思维导图 + 详情 ===== */}
      <div className="space-y-4">
        <MarkmapPane
          data={data}
          materialTitle={materialTitle}
          onSelect={setSelected}
        />
        {selected && data[selected] && (
          <EntityDetail entity={data[selected]} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  );
}

/* ============================================================
   markmap 思维导图（移植自 fast_read_book reader.html）
   ============================================================ */

function MarkmapPane({
  data,
  materialTitle,
  onSelect,
}: {
  data: KGData;
  materialTitle: string;
  onSelect: (name: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [markmap, setMarkmap] = useState<any>(null);
  const [lib, setLib] = useState<{ d3: any; Markmap: any } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d3 = await import('d3');
        const { Markmap } = await import('markmap-view');
        if (!cancelled) {
          setLib({ d3, Markmap });
        }
      } catch (e) {
        console.error('markmap 加载失败', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!lib || !svgRef.current) return;
    const { Markmap } = lib;

    const tree = buildMarkmapTree(data, materialTitle);

    let mm = markmap;
    if (!mm) {
      mm = Markmap.create(svgRef.current, {
        duration: 300,
        maxWidth: 300,
        spacingVertical: 10,
        spacingHorizontal: 60,
        initialExpandLevel: 2,
        paddingX: 14,
      });
      setMarkmap(mm);
    }
    mm.setData(tree);
    mm.fit();
  }, [lib, data, materialTitle]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">🗺️ 知识图谱 · 思维导图</CardTitle>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => markmap?.fit()}>
            适应
          </Button>
          <Button size="sm" variant="ghost" onClick={() => markmap?.zoomIn()}>
            +
          </Button>
          <Button size="sm" variant="ghost" onClick={() => markmap?.zoomOut()}>
            −
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="bg-secondary/40" style={{ height: 480 }}>
          <svg
            ref={svgRef}
            className="h-full w-full"
            onClick={(e) => {
              if (e.target === e.currentTarget) onSelect('');
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/** KGData → markmap 树（按章节分组 → 实体） */
function buildMarkmapTree(data: KGData, rootTitle: string) {
  const chapters = new Map<number, { content: string; children: any[] }>();
  for (const entity of Object.values(data)) {
    const ch = entity.ch_num || 1;
    if (!chapters.has(ch)) {
      chapters.set(ch, { content: `第${ch}章`, children: [] });
    }
    chapters.get(ch)!.children.push({ content: entity.name, children: [] });
  }
  const sortedChapters = [...chapters.entries()].sort((a, b) => a[0] - b[0]);
  return {
    content: rootTitle,
    children: sortedChapters.map(([, v]) => v),
  };
}

/* ============================================================
   实体详情面板
   ============================================================ */

function EntityDetail({ entity, onClose }: { entity: KGEntity; onClose: () => void }) {
  return (
    <Card className="border-primary/40">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-lg">{entity.name}</CardTitle>
          <CardDescription>
            {entity.is_reference ? '📄 参考文献' : entity.is_section_title ? '📑 章节标题' : '🧩 实体'}
            {entity.ch_num ? ` · 第${entity.ch_num}章` : ''}
            {entity.parent ? ` · 父级: ${entity.parent}` : ''}
          </CardDescription>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {entity.definition ? <DetailBlock title="定义" text={entity.definition} /> : null}
        {entity.summary ? <DetailBlock title="AI 理解" text={entity.summary} /> : null}
        {entity.paragraph ? <DetailBlock title="原文段落" text={entity.paragraph} /> : null}
        {entity.related_entities.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium">
              相关实体（{entity.related_entities.length}）
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {entity.related_entities.slice(0, 30).map((rel, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                >
                  <Highlighter className="h-3 w-3 text-muted-foreground" />
                  {rel.name}
                  <span className="text-[10px] text-muted-foreground">· {rel.type}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DetailBlock({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h4 className="mb-1 text-sm font-medium">{title}</h4>
      <p className="whitespace-pre-wrap rounded-md bg-secondary/60 p-3 text-sm leading-6">
        {text.slice(0, 2000)}
        {text.length > 2000 ? '…' : ''}
      </p>
    </div>
  );
}

/* ============================================================
   原文阅读（文本定位）
   ============================================================ */

function FullTextView({
  fullText,
  highlight,
  onSelect,
}: {
  fullText: string | null;
  highlight: string | null;
  onSelect: (name: string) => void;
}) {
  const text = fullText ?? '';
  if (!text) {
    return <p className="py-4 text-center text-xs text-muted-foreground">暂无原文</p>;
  }

  const parts = splitByHighlight(text, highlight);
  return (
    <div className="max-h-[60vh] overflow-y-auto rounded-md bg-secondary/30 p-3 text-xs leading-6">
      {parts.map((part, i) =>
        part.isHighlight && highlight ? (
          <button
            key={i}
            className="rounded bg-yellow-200 px-0.5 hover:bg-yellow-300"
            onClick={() => onSelect(highlight)}
          >
            {part.text}
          </button>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </div>
  );
}

function splitByHighlight(text: string, highlight: string | null) {
  if (!highlight) return [{ text, isHighlight: false }];
  const parts: { text: string; isHighlight: boolean }[] = [];
  let idx = 0;
  const lower = text.toLowerCase();
  const hlLower = highlight.toLowerCase();
  while (idx < text.length) {
    const found = lower.indexOf(hlLower, idx);
    if (found < 0) {
      parts.push({ text: text.slice(idx), isHighlight: false });
      break;
    }
    if (found > idx) parts.push({ text: text.slice(idx, found), isHighlight: false });
    parts.push({ text: text.slice(found, found + highlight.length), isHighlight: true });
    idx = found + highlight.length;
  }
  return parts;
}