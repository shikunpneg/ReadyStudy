# ReadyStudy 📚

> 基于自有资料的 AI 智能出题学习系统。Fork 自 [shikunpneg/fast_read_book](https://github.com/shikunpneg/fast_read_book)，保留其在线阅读/笔记/知识导图能力，**核心新增** AI 出题与答题反馈。

## ✨ 功能特性

- 🔐 **三种登录**：魔法链接 / 邮箱密码 / GitHub & Google OAuth
- 📤 **多格式资料**：PDF / TXT / PPTX / DOCX 一并支持
- 🧠 **AI 出题（核心）**：单选、多选、判断、填空、简答、名词解释、论述题
  - 混合策略：上传后预生成核心题 50 道，"再来 N 道"实时扩题
  - 用户自带 Key（BYOK）：DeepSeek / OpenAI 双支持，AES 加密存储
- 📖 **在线阅读 + 笔记**：分段渲染、边读边记
- 🗺️ **知识导图**：自动生成思维导图
- 📊 **学习 Dashboard**：答题曲线、知识点雷达图、错题分布
- 🎨 **蓝色实用风**：Tailwind + shadcn/ui，单一主色 `#2563EB`

## 🛠 技术栈

| 层 | 选型 |
|----|------|
| 框架 | Next.js 15 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui (蓝主题) |
| ORM | Drizzle ORM |
| 数据库 | Vercel Postgres |
| 文件存储 | Vercel Blob |
| 向量库 | Vercel KV (Upstash Redis) |
| 鉴权 | Auth.js v5 (NextAuth) |
| AI | DeepSeek / OpenAI (BYOK) |
| 部署 | Vercel |

## 🚀 本地开发

```bash
# 1. 安装依赖
pnpm install    # 推荐 pnpm

# 2. 复制环境变量并填写
cp .env.example .env.local

# 3. 启动 DB（可选：docker-compose up -d postgres redis）

# 4. 跑迁移
pnpm db:push

# 5. 启动
pnpm dev
```

打开 http://localhost:3000

## 📁 目录结构

```
src/
├─ app/             # App Router
│  ├─ (auth)/       # 登录注册
│  ├─ (main)/       # 主布局
│  │  ├─ dashboard/
│  │  ├─ materials/
│  │  ├─ upload/
│  │  ├─ wrong-questions/
│  │  └─ settings/
│  └─ api/
├─ components/      # UI 组件
├─ lib/             # 业务工具
│  ├─ db/           # Drizzle
│  ├─ ai/           # LLM 抽象
│  ├─ parsers/      # 文档解析
│  └─ auth.ts
└─ types/
```

## 🌿 Git 分支

- `main` — 生产（Vercel 自动部署）
- `dev` — 开发集成分支
- `feat/*` — 功能分支

## 📜 License

MIT