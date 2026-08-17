/**
 * 向量与文本一起存到 Vercel KV。key: vec:{materialId}:{chunkIndex}
 * value: { embedding: number[], content: string }
 */
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;
function getRedis() {
  if (redis) return redis;
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
  return redis;
}

export async function putVector(materialId: string, chunkIndex: number, payload: { embedding: number[]; content: string }) {
  const r = getRedis();
  if (!r) return; // 本地无 KV 时静默跳过
  await r.set(`vec:${materialId}:${chunkIndex}`, JSON.stringify(payload));
}

export interface RetrievedChunk {
  content: string;
  score: number;
  chunkIndex: number;
}

export async function retrieveTopK(
  materialId: string,
  queryEmbedding: number[],
  k = 6,
): Promise<RetrievedChunk[]> {
  const r = getRedis();
  if (!r) return [];
  // 简单扫描 key，生产可改用专用向量库
  const keys: string[] = [];
  let cursor = 0;
  do {
    const scan = await r.scan(cursor, { match: `vec:${materialId}:*`, count: 200 });
    cursor = scan[0];
    keys.push(...scan[1]);
  } while (cursor !== 0);

  if (!keys.length) return [];

  const values = await r.mget<(string | null)[]>(...keys);
  const items: { score: number; content: string; chunkIndex: number }[] = [];
  values.forEach((v, i) => {
    if (!v) return;
    const parsed = typeof v === 'string' ? JSON.parse(v) : (v as unknown);
    const score = cosine(queryEmbedding, parsed.embedding);
    const idx = Number(keys[i].split(':').pop());
    items.push({ score, content: parsed.content, chunkIndex: idx });
  });
  items.sort((a, b) => b.score - a.score);
  return items.slice(0, k);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot;
}