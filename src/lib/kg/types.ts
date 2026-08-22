/**
 * 知识图谱数据类型 —— 与 fast_read_book kg_core 输出结构完全一致
 */

export interface KGRelatedEntity {
  name: string;
  type: string; // '父章节' | '子概念' | '同章' | '定义共现'
  strength: number;
}

export interface KGEntity {
  name: string;
  ch_num: number;
  weight: number;
  definition: string;
  paragraph: string;
  summary: string;
  is_section_title: boolean;
  is_reference?: boolean;
  depth?: number;
  parent?: string;
  /** 情节推进阶段（story 模式） */
  story_stage?: number;
  /** 论证逻辑阶段（argument 模式） */
  arg_stage?: number;
  /** 元节点标记 */
  category?: string;
  related_entities: KGRelatedEntity[];
}

/** key = 实体名 */
export type KGData = Record<string, KGEntity>;

export interface KGStats {
  total_entities: number;
  total_relations: number;
  with_definition: number;
  with_paragraph: number;
  new_entities: number;
  new_relations: number;
}
