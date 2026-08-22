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

type Mode = 'chapter' | 'story' | 'argument';

/**
 * 三视图知识图谱阅读器
 * 忠实移植 fast_read_book kg_v7.js：
 *  - markdown 方式构建 markmap 树（Transformer.transform）
 *  - 三种模式：章节 / 情节推进(story_stage) / 论证逻辑(arg_stage)
 *  - 父字段层级（LTP 风格）
 *  - 文本定位 jumpToSource
 *  - markmap 配置：colorFreezeLevel:2, autoFit, initialExpandLevel:2
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
  const [mode, setMode] = useState<Mode>('chapter');
  const [noteText, setNoteText] = useState<Record<string, string>>({});

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
            使用 fast_read_book 引擎：提取章节标题 + 参考文献作为实体，自动构建定义、段落与关系图谱。
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
                <EntityList
                  data={data}
                  selected={selected}
                  onSelect={setSelected}
                />
              </>
            ) : (
              <FullTextView
                fullText={fullText}
                highlight={selected}
                onSelect={setSelected}
              />
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
          mode={mode}
          onSelect={setSelected}
        />
        {selected && data[selected] && (
          <EntityDetail
            entity={data[selected]}
            note={noteText[selected] ?? ''}
            onNoteChange={(v) => setNoteText((p) => ({ ...p, [selected]: v }))}
            onClose={() => setSelected(null)}
            onLocate={() => setTab('text')}
          />
        )}
      </div>
    </div>
  );
}

/* ============================================================
   实体列表（按章节分组 + 参考文献折叠）
   ============================================================ */

function EntityList({
  data,
  selected,
  onSelect,
}: {
  data: KGData;
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  const chapterMap = new Map<number, string[]>();
  const refs: string[] = [];
  for (const [name, ent] of Object.entries(data)) {
    if (ent.is_reference) {
      refs.push(name);
    } else {
      const ch = ent.ch_num || 1;
      if (!chapterMap.has(ch)) chapterMap.set(ch, []);
      chapterMap.get(ch)!.push(name);
    }
  }
  const sortedChs = [...chapterMap.keys()].sort((a, b) => a - b);

  return (
    <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
      {sortedChs.map((ch) => (
        <div key={ch}>
          <p className="mb-1 px-2 text-[11px] font-semibold uppercase text-muted-foreground">
            第{ch}节（{(chapterMap.get(ch) ?? []).length}）
          </p>
          <div className="space-y-0.5">
            {(chapterMap.get(ch) ?? []).map((name) => (
              <EntityItem
                key={name}
                name={name}
                active={selected === name}
                onClick={() => onSelect(name)}
              />
            ))}
          </div>
        </div>
      ))}
      {refs.length > 0 && (
        <div className="border-t pt-2">
          <p className="mb-1 px-2 text-[11px] font-semibold uppercase text-muted-foreground">
            参考文献（{refs.length}）
          </p>
          <div className="space-y-0.5">
            {refs.slice(0, 30).map((name) => (
              <EntityItem
                key={name}
                name={name}
                active={selected === name}
                onClick={() => onSelect(name)}
                isRef
              />
            ))}
            {refs.length > 30 && (
              <p className="px-2 text-[10px] text-muted-foreground">
                还有 {refs.length - 30} 条…（图上可查看）
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EntityItem({
  name,
  active,
  onClick,
  isRef,
}: {
  name: string;
  active: boolean;
  onClick: () => void;
  isRef?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`block w-full truncate rounded-md px-2 py-1 text-left text-sm transition ${
        active ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
      }`}
    >
      {isRef && <span className="mr-1 text-[10px] opacity-60">📄</span>}
      {name}
    </button>
  );
}

/* ============================================================
   markmap 思维导图（忠实移植 kg_v7.js buildMarkmap）
   用 markdown 字符串 + Transformer.transform 构建
   ============================================================ */

function MarkmapPane({
  data,
  materialTitle,
  mode,
  onSelect,
}: {
  data: KGData;
  materialTitle: string;
  mode: Mode;
  onSelect: (name: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [markmap, setMarkmap] = useState<any>(null);
  const [lib, setLib] = useState<any>(null);
  const [renderErr, setRenderErr] = useState<string | null>(null);

  // 加载 markmap 库
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Transformer } = await import('markmap-lib');
        const { Markmap } = await import('markmap-view');
        if (!cancelled) setLib({ Transformer, Markmap });
      } catch (e) {
        console.error('markmap 加载失败', e);
        setRenderErr('markmap 加载失败');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 构建 markdown → markmap 树
  useEffect(() => {
    if (!lib || !containerRef.current) return;
    const { Transformer, Markmap } = lib;
    try {
      const md = buildMarkdownFromEntities(data, materialTitle, mode);
      const transformer = new Transformer();
      const { root } = transformer.transform(md);

      const container = containerRef.current;
      container.innerHTML = '';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('style', 'width:100%;height:100%');
      container.appendChild(svg);

      const mm = Markmap.create(svg, {
        autoFit: true,
        colorFreezeLevel: 2,
        initialExpandLevel: 2,
        maxWidth: 300,
        duration: 400,
        paddingX: 16,
        spacingHorizontal: 80,
        spacingVertical: 8,
        pan: true,
        zoom: true,
      }, root);
      setMarkmap(mm);

      // 点击节点 → 详情
      const svgEl = svg as unknown as SVGSVGElement;
      svgEl.addEventListener('click', (e: Event) => {
        let target = e.target as Element | null;
        while (target && target !== svgEl) {
          if (target.tagName === 'circle') return; // 折叠圆点不处理
          target = target.parentElement;
        }
        // 找到点击的 g 节点，取文本
        const textEl = (e.target as Element)?.closest('g[data-id]');
        if (textEl) {
          const content = textEl.getAttribute('data-name');
          if (content && data[content]) onSelect(content);
        }
      });
    } catch (e) {
      console.error('Markmap 渲染失败:', e);
      setRenderErr((e as Error).message);
    }
  }, [lib, data, materialTitle, mode]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">🗺️ 知识图谱 · 思维导图</CardTitle>
          <ModeSwitcher mode={mode} onModeChange={(m) => onSelect('')} />
        </div>
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
        <div className="bg-secondary/40" style={{ height: 500 }}>
          <div ref={containerRef} className="h-full w-full" />
          {renderErr && (
            <p className="p-6 text-center text-sm text-destructive">{renderErr}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** 模式切换（章节 / 情节 / 论证） */
function ModeSwitcher({
  mode,
  onModeChange,
}: {
  mode: Mode;
  onModeChange: (m: Mode) => void;
}) {
  const opts: { key: Mode; label: string }[] = [
    { key: 'chapter', label: '📑 章节' },
    { key: 'story', label: '🎭 情节' },
    { key: 'argument', label: '🧠 论证' },
  ];
  return (
    <div className="flex rounded-md border">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onModeChange(o.key)}
          className={`px-2 py-1 text-xs transition ${
            mode === o.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * 构建 markdown（忠实移植 kg_v7.js buildMarkdownFromEntities）
 *  - 有 parent 字段 → 层级树
 *  - story/argument → 按阶段分组
 *  - 默认 → 按章节分组
 */
function buildMarkdownFromEntities(data: KGData, bookName: string, mode: Mode): string {
  const ents = data;
  const names = Object.keys(ents);
  if (names.length === 0) return '';

  const hasParent = Object.values(ents).some((e) => (e.parent ?? '') !== '');
  if (hasParent) return buildMarkdownHierarchical(ents);

  if (mode === 'story') {
    return buildMarkdownByStage(ents, 'story_stage', '🎭 情节推进');
  } else if (mode === 'argument') {
    return buildMarkdownByStage(ents, 'arg_stage', '🧠 论证逻辑');
  }
  return buildMarkdownByChapter(ents, bookName);
}

function buildMarkdownByChapter(ents: KGData, bookName: string): string {
  const chapterMap = new Map<number, string[]>();
  const metaNodes: string[] = [];

  for (const [name, ent] of Object.entries(ents)) {
    if (ent.ch_num === 0) {
      metaNodes.push(name);
    } else {
      const ch = ent.ch_num || 1;
      if (!chapterMap.has(ch)) chapterMap.set(ch, []);
      chapterMap.get(ch)!.push(name);
    }
  }
  for (const ch of chapterMap.keys()) {
    chapterMap.get(ch)!.sort((a, b) => (ents[b].weight || 0) - (ents[a].weight || 0));
  }

  const lines: string[] = [];
  if (metaNodes.length > 0) {
    lines.push('# 📋 全书概览');
    metaNodes.sort((a, b) => (ents[b].weight || 0) - (ents[a].weight || 0));
    for (const name of metaNodes) lines.push(`## ${name}`);
    lines.push('');
  }

  const sortedChs = [...chapterMap.keys()].sort((a, b) => a - b);
  for (const ch of sortedChs) {
    lines.push(`# 第${ch}节`);
    for (const name of chapterMap.get(ch)!) lines.push(`## ${name}`);
  }
  return lines.join('\n');
}

function buildMarkdownByStage(ents: KGData, stageField: string, modeTitle: string): string {
  const groups = new Map<string, string[]>();
  for (const [name, ent] of Object.entries(ents)) {
    if (ent.ch_num === 0) continue;
    const stage = stageField === 'story_stage' ? ent.story_stage : ent.arg_stage;
    const key = stage === undefined || stage === null ? '未分类' : `阶段${stage}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(name);
  }
  const lines = [`# ${modeTitle}`];
  let i = 1;
  for (const key of groups.keys()) {
    lines.push(`## ${i}. ${key}`);
    for (const name of groups.get(key)!) lines.push(`### ${name}`);
    i++;
  }
  return lines.join('\n');
}

function buildMarkdownHierarchical(ents: KGData): string {
  const childrenMap = new Map<string, string[]>();
  for (const [name, ent] of Object.entries(ents)) {
    const parent = ent.parent || '';
    if (!childrenMap.has(parent)) childrenMap.set(parent, []);
    childrenMap.get(parent)!.push(name);
  }
  const roots = (childrenMap.get('') ?? []).filter((n) => ents[n]);
  const lines: string[] = [];

  if (roots.length === 1) {
    lines.push(`# ${roots[0]}`);
    addChildrenRecursive(roots[0], 2, lines, childrenMap);
  } else {
    lines.push('# 知识图谱');
    for (const rn of roots) {
      lines.push(`## ${rn}`);
      addChildrenRecursive(rn, 3, lines, childrenMap);
    }
  }
  return lines.join('\n');
}

function addChildrenRecursive(parentName: string, level: number, lines: string[], childrenMap: Map<string, string[]>) {
  const children = childrenMap.get(parentName) ?? [];
  const prefix = '#'.repeat(Math.min(level, 6));
  for (const childName of children) {
    lines.push(`${prefix} ${childName}`);
    addChildrenRecursive(childName, level + 1, lines, childrenMap);
  }
}

/* ============================================================
   实体详情面板
   ============================================================ */

function EntityDetail({
  entity,
  note,
  onNoteChange,
  onClose,
  onLocate,
}: {
  entity: KGEntity;
  note: string;
  onNoteChange: (v: string) => void;
  onClose: () => void;
  onLocate: () => void;
}) {
  return (
    <Card className="border-primary/40">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-lg">{entity.name}</CardTitle>
          <CardDescription>
            {entity.is_reference ? '📄 参考文献' : entity.is_section_title ? '📑 章节标题' : '🧩 实体'}
            {entity.ch_num ? ` · 第${entity.ch_num}节` : ''}
            {entity.parent ? ` · 父级: ${entity.parent}` : ''}
          </CardDescription>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onLocate}>
            <BookMarked className="mr-1 h-3.5 w-3.5" />
            定位原文
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
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
   原文阅读（文本定位，移植 kg_v7.js jumpToSource）
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