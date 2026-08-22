import { readFileSync } from 'fs';
const lines = readFileSync('.env.vercel', 'utf8').split(/\r?\n/);
const get = (k) => { const l = lines.find((x) => x.startsWith(k + '=')); return l ? l.slice(k.length + 1).replace(/^"|"$/g, '') : ''; };
const url = get('POSTGRES_URL_NON_POOLING');
const pg = await import('pg');
const c = new pg.default.Client({ connectionString: url });
await c.connect();
const ids = ['fdc8ad38-8eb0-4a93-95cc-d2c5b8bc2511', '087e96a7-a8e9-40e4-a3d5-c788c2536fbe'];
for (const id of ids) {
  const { rows } = await c.query('SELECT title, type, status, length(file_data) as fdata FROM materials WHERE id = $1', [id]);
  const m = rows[0];
  if (!m) { console.log(id, '=> NOT FOUND'); continue; }
  console.log('\n===', id, '|', m.title, '|', m.type, '|', m.status, '| fileData:', m.fdata);
  const ch = await c.query('SELECT count(*)::int as n FROM chunks WHERE material_id = $1', [id]);
  console.log('chunks:', ch.rows[0].n);
  const c2 = await c.query('SELECT content FROM chunks WHERE material_id = $1 ORDER BY chunk_index LIMIT 3', [id]);
  c2.rows.forEach((r, i) => console.log(`  chunk${i}: ${r.content.slice(0, 120)}`));
}
await c.end();