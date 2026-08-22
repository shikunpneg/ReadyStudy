/**
 * 关系构建
 * 移植自 fast_read_book kg_core/builder.py build_relations()
 */
import type { KGData } from './types';

export function buildRelations(data: KGData): number {
  // 1. 收集每章实体
  const chEntities = new Map<number, string[]>();
  for (const [name, info] of Object.entries(data)) {
    const ch = info.ch_num || 1;
    if (!chEntities.has(ch)) chEntities.set(ch, []);
    chEntities.get(ch)!.push(name);
  }

  const addedEdges = new Set<string>();

  // 2. 同章内：父子/兄弟
  for (const [, entities] of chEntities) {
    const sorted = [...entities].sort((a, b) => {
      const aIsSec = data[a].is_section_title ? 1 : 0;
      const bIsSec = data[b].is_section_title ? 1 : 0;
      if (aIsSec !== bIsSec) return bIsSec - aIsSec;
      if (a.length !== b.length) return b.length - a.length;
      return a < b ? -1 : 1;
    });

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const ei = sorted[i];
        const ej = sorted[j];
        const key = `${ei}\u0000${ej}`;
        if (addedEdges.has(key)) continue;
        addedEdges.add(key);

        const defA = data[ei].definition || data[ei].paragraph || '';
        const defB = data[ej].definition || data[ej].paragraph || '';

        let relTypeI: string, relTypeJ: string;
        if (defA.includes(ej) && !defB.includes(ei)) {
          relTypeI = '子概念';
          relTypeJ = '父章节';
        } else if (defB.includes(ei) && !defA.includes(ej)) {
          relTypeI = '父章节';
          relTypeJ = '子概念';
        } else {
          relTypeI = '同章';
          relTypeJ = '同章';
        }

        data[ei].related_entities.push({ name: ej, type: relTypeI, strength: 0.7 });
        data[ej].related_entities.push({ name: ei, type: relTypeJ, strength: 0.7 });

        if (relTypeI === '父章节' && !data[ej].parent) data[ej].parent = ei;
        if (relTypeJ === '父章节' && !data[ei].parent) data[ei].parent = ej;
      }
    }
  }

  // 3. 跨章节：定义共现
  const names = Object.keys(data);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const info = data[name];
    const defText = (info.definition || '') + (info.paragraph || '');
    for (let j = 0; j < names.length; j++) {
      if (i >= j) continue;
      const other = names[j];
      const oinfo = data[other];
      if (name >= other) continue;
      if (
        defText.includes(other) ||
        (oinfo.definition || '').includes(name) ||
        (oinfo.paragraph || '').includes(name)
      ) {
        const key = `${name}\u0000${other}`;
        if (addedEdges.has(key)) continue;
        addedEdges.add(key);
        data[name].related_entities.push({ name: other, type: '定义共现', strength: 0.6 });
        data[other].related_entities.push({ name, type: '定义共现', strength: 0.6 });
      }
    }
  }

  return addedEdges.size;
}
