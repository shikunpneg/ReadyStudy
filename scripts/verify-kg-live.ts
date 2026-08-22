import { readFileSync } from 'fs';
import { buildKnowledgeGraph } from '../src/lib/kg/index.js';

async function main() {
  const lines = readFileSync('.env.vercel', 'utf8').split(/\r?\n/);
  const get = (k) => {
    const l = lines.find((x) => x.startsWith(k + '='));
    return l ? l.slice(k.length + 1).replace(/^"|"$/g, '') : '';
  };
  const url = get('POSTGRES_URL_NON_POOLING');
  const pg = await import('pg');
  const c = new pg.default.Client({ connectionString: url });
  await c.connect();

  const ids = ['fdc8ad38-8eb0-4a93-95cc-d2c5b8bc2511', '087e96a7-a8e9-40e4-a3d5-c788c2536fbe'];
  for (const id of ids) {
    const { rows } = await c.query(
      'SELECT content FROM chunks WHERE material_id = $1 ORDER BY chunk_index',
      [id],
    );
    const text = rows.map((r) => r.content).join('\n\n');
    console.log(`\n=== ${id.slice(0, 8)} (${text.length} chars) ===`);
    const { data, stats } = buildKnowledgeGraph(text, {});
    console.log(`实体: ${stats.total_entities}, 关系: ${stats.total_relations}, 定义: ${stats.with_definition}`);
    console.log('前10实体:', Object.keys(data).slice(0, 10).join(' | '));
    const first = Object.values(data)[0];
    if (first) console.log('首个定义:', (first.definition || '(空)').slice(0, 80));
  }
  await c.end();
}
main();