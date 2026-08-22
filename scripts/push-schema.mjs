import { readFileSync } from 'fs';
const lines = readFileSync('.env.vercel', 'utf8').split(/\r?\n/);
const get = (k) => { const l = lines.find((x) => x.startsWith(k + '=')); return l ? l.slice(k.length + 1).replace(/^"|"$/g, '') : ''; };
const url = get('POSTGRES_URL_NON_POOLING');
if (!url) process.exit(1);
const pg = await import('pg');
const c = new pg.default.Client({ connectionString: url });
await c.connect();
try {
  await c.query("ALTER TABLE notes ADD COLUMN IF NOT EXISTS highlight_text text");
  await c.query("ALTER TABLE notes ADD COLUMN IF NOT EXISTS kind varchar(16) DEFAULT 'free' NOT NULL");
  console.log('OK notes');
} catch (e) { console.error('FAIL', e.message); process.exit(1); }
finally { await c.end(); }