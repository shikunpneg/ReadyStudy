import { readFileSync } from 'fs';
const lines = readFileSync('.env.vercel', 'utf8').split(/\r?\n/);
const get = (k) => { const l = lines.find((x) => x.startsWith(k + '=')); return l ? l.slice(k.length + 1).replace(/^"|"$/g, '') : ''; };
const url = get('POSTGRES_URL_NON_POOLING');
if (!url) process.exit(1);
const pg = await import('pg');
const c = new pg.default.Client({ connectionString: url });
await c.connect();
try {
  await c.query(`CREATE TABLE IF NOT EXISTS knowledge_graphs (
    material_id text PRIMARY KEY REFERENCES materials(id) ON DELETE CASCADE,
    data jsonb NOT NULL,
    stats jsonb NOT NULL,
    full_text text,
    updated_at timestamptz DEFAULT now() NOT NULL
  )`);
  console.log('OK kg table');
} catch (e) { console.error('FAIL', e.message); process.exit(1); }
finally { await c.end(); }