'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { saveNoteAction, deleteNoteAction } from './actions';
import { Plus, Trash2 } from 'lucide-react';

interface Chunk {
  id: string;
  index: number;
  content: string;
}

interface Note {
  id: string;
  chunkId: string | null;
  content: string;
}

export function ReaderClient({
  materialId,
  chunks,
  notes,
}: {
  materialId: string;
  chunks: Chunk[];
  notes: Note[];
}) {
  const [noteList, setNoteList] = useState(notes);
  const [draft, setDraft] = useState<Record<string, string>>({});

  async function addNote(chunkId: string) {
    const content = (draft[chunkId] ?? '').trim();
    if (!content) return;
    const r = await saveNoteAction({ materialId, chunkId, content });
    if (r.ok) {
      setNoteList((n) => [...n, { id: r.noteId, chunkId, content }]);
      setDraft((d) => ({ ...d, [chunkId]: '' }));
    }
  }

  async function delNote(noteId: string) {
    const r = await deleteNoteAction({ noteId });
    if (r.ok) setNoteList((n) => n.filter((x) => x.id !== noteId));
  }

  const notesByChunk = noteList.reduce<Record<string, Note[]>>((acc, n) => {
    if (!n.chunkId) return acc;
    (acc[n.chunkId] ||= []).push(n);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {chunks.map((c) => (
        <Card key={c.id}>
          <CardContent className="space-y-3 pt-6">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{c.content}</p>

            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                笔记（{(notesByChunk[c.id] ?? []).length}）
              </summary>
              <div className="mt-2 space-y-2">
                {(notesByChunk[c.id] ?? []).map((n) => (
                  <div key={n.id} className="flex items-start gap-2 rounded bg-secondary p-2">
                    <p className="flex-1 whitespace-pre-wrap">{n.content}</p>
                    <Button size="icon" variant="ghost" onClick={() => delNote(n.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Textarea
                  rows={2}
                  value={draft[c.id] ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, [c.id]: e.target.value }))}
                  placeholder="写下你的笔记…"
                />
                <Button size="sm" onClick={() => addNote(c.id)} disabled={!draft[c.id]?.trim()}>
                  <Plus className="mr-1 h-3 w-3" />
                  保存笔记
                </Button>
              </div>
            </details>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}