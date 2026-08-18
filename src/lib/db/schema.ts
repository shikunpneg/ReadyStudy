import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  integer,
  jsonb,
  varchar,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from 'next-auth/adapters';

/* ========== Auth.js 标准表 ========== */

export const users = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  // 自有字段
  hashedPassword: text('hashed_password'),
  plan: varchar('plan', { length: 16 }).default('free').notNull(), // 'free' | 'pro'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const accounts = pgTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  }),
);

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => ({ pk: primaryKey({ columns: [vt.identifier, vt.token] }) }),
);

/* ========== 用户设置（BYOK） ========== */

export const userSettings = pgTable('user_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  llmProvider: varchar('llm_provider', { length: 32 }).default('deepseek').notNull(), // 'deepseek' | 'openai' | 'custom'
  encryptedApiKey: text('encrypted_api_key'),
  modelName: varchar('model_name', { length: 64 }).default('deepseek-chat').notNull(),
  embedModelName: varchar('embed_model_name', { length: 64 })
    .default('text-embedding-3-small')
    .notNull(),
  // 自定义 Provider 时使用（OpenAI 兼容 baseURL）
  baseUrl: text('base_url'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/* ========== 学习资料 ========== */

export const materials = pgTable(
  'materials',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    type: varchar('type', { length: 16 }).notNull(), // 'pdf'|'txt'|'pptx'|'docx'
    blobUrl: text('blob_url').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    status: varchar('status', { length: 16 }).default('uploaded').notNull(),
    // 'uploaded' | 'processing' | 'ready' | 'failed'
    errorMsg: text('error_msg'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({ userIdx: index('mat_user_idx').on(t.userId) }),
);

export const chunks = pgTable(
  'chunks',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    materialId: text('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    tokenCount: integer('token_count').notNull(),
    kvKey: text('kv_key').notNull(), // 向量在 KV 中的 key
  },
  (t) => ({ matIdx: index('chunk_mat_idx').on(t.materialId) }),
);

/* ========== 题目 ========== */

export type QuestionType =
  | 'single'
  | 'multiple'
  | 'judge'
  | 'fill'
  | 'short'
  | 'define'
  | 'essay';

export const questions = pgTable(
  'questions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    materialId: text('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 16 }).notNull().$type<QuestionType>(),
    difficulty: varchar('difficulty', { length: 8 }).default('medium').notNull(),
    content: text('content').notNull(),
    options: jsonb('options'), // { A:'..', B:'..' } | null
    answer: jsonb('answer').notNull(), // string | string[] | {keywords:[], modelAnswer}
    explanation: text('explanation'),
    sourceChunkIds: jsonb('source_chunk_ids').$type<string[]>(),
    isPreGenerated: boolean('is_pre_generated').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('q_user_idx').on(t.userId),
    matIdx: index('q_mat_idx').on(t.materialId),
  }),
);

/* ========== 答题记录 / 错题本 ========== */

export const attempts = pgTable(
  'attempts',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    questionId: text('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    userAnswer: jsonb('user_answer').notNull(),
    isCorrect: boolean('is_correct').notNull(),
    score: integer('score').default(0).notNull(), // 0-100
    feedback: text('feedback'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({ userIdx: index('att_user_idx').on(t.userId) }),
);

export const wrongQuestions = pgTable(
  'wrong_questions',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    questionId: text('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    wrongCount: integer('wrong_count').default(1).notNull(),
    lastWrongAt: timestamp('last_wrong_at').defaultNow().notNull(),
    reviewCount: integer('review_count').default(0).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.questionId] }) }),
);

/* ========== 知识导图 / 笔记（继承 fast_read_book） ========== */

export const mindmaps = pgTable('mindmaps', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  materialId: text('material_id')
    .notNull()
    .references(() => materials.id, { onDelete: 'cascade' }),
  structure: jsonb('structure').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notes = pgTable(
  'notes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    materialId: text('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'cascade' }),
    chunkId: text('chunk_id'),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({ userIdx: index('note_user_idx').on(t.userId) }),
);