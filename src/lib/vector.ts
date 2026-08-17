/**
 * 向量与文本一起存到 KV。
 *
 * 生产：Vercel KV（Upstash REST API）
 * 本地：原生 Redis（docker-compose.yml 中的 redis 服务）
 *
 * 适配：通过判断 KV_REST_API_URL 协议前缀自动选择。
 */
import { Redis } from '@upstash/redis';
import { createClient, RedisClientType } from 'redis';

interface RedisLike {
  set(key: string, value: string): Promise<unknown>;
  get(key: string): Promise<unknown>;
  mget(...keys: string[]): Promise<(unknown | null)[]>;
  scan(cursor: string, opts: { match: string; count: number }): Promise<unknown>;
}

let _client: RedisLike | null = null;

async function getRedis(): Promise<RedisLike | null> {
  if (_client) return _client;
  const url = process.env.KV_REST_API_URL;
  if (!url) return null;

  if (url.startsWith('redis://') || url.startsWith('rediss://')) {
    // 本地 Redis（原生协议）
    const client: RedisClientType = createClient({ url });
    await client.connect();
    _client = client as unknown as RedisLike;
  } else {
    // Upstash REST 协议
    _client = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    }) as unknown as RedisLike;
  }
  return _client;
}

export async function putVector(
  materialId: string,
  chunkIndex: number,
  payload: { embedding: number[]; content: string },
) {
  const r = await getRedis();
  if (!r) return;
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
  const r = await getRedis();
  if (!r) return [];
  const keys: string[] = [];
  let cursor = '0';
  do {
    const res = (await r.scan(cursor, {
      match: `vec:${materialId}:*`,
      count: 200,
    })) as unknown as [string, string[]];
    cursor = res[0];
    keys.push(...res[1]);
  } while (cursor !== '0');

  if (!keys.length) return [];

  const values = (await r.mget(...keys)) as unknown[];
  const items: { score: number; content: string; chunkIndex: number }[] = [];
  values.forEach((v, i) => {
    if (!v) return;
    const parsed = typeof v === 'string' ? JSON.parse(v) : (v as Record<string, unknown>);
    const emb = parsed.embedding as number[];
    const score = cosine(queryEmbedding, emb);
    const idx = Number(keys[i].split(':').pop());
    items.push({ score, content: String(parsed.content), chunkIndex: idx });
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
