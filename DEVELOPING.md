# 开发者指南

## 本地开发

```bash
# 1. 安装依赖
pnpm install

# 2. 初始化 husky（首次）
pnpm prepare

# 3. 准备环境变量
cp .env.example .env.local
# 编辑 .env.local

# 4. 启动
pnpm dev
```

## 脚本命令

| 命令 | 作用 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 生产构建 |
| `pnpm start` | 启动生产服务器 |
| `pnpm lint` | ESLint 检查 |
| `pnpm lint:fix` | ESLint 自动修复 |
| `pnpm format` | Prettier 全量格式化 |
| `pnpm format:check` | Prettier 检查（不修改） |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm db:generate` | 生成 Drizzle 迁移 |
| `pnpm db:push` | 推送迁移到数据库 |
| `pnpm db:studio` | 打开 Drizzle Studio |
| `pnpm commit` | 交互式 commit（cz） |
| `pnpm setup` | 一键初始化（pwsh） |
| `pnpm push:github` | 推送到 GitHub（pwsh） |

## 提交规范（Conventional Commits）

使用 `pnpm commit` 进入交互式提交：

```
? 选择变更类型：feat
? 影响范围（可选）：quiz
? 简短描述（必填）：新增填空题自动评分
? 详细说明（可选）：
```

最终 commit：`feat(quiz): 新增填空题自动评分`

### type 类型
- `feat` 新功能
- `fix` 修复
- `docs` 文档
- `style` 格式
- `refactor` 重构
- `perf` 性能
- `test` 测试
- `chore` 工具
- `build` 构建
- `ci` CI
- `revert` 回滚

### scope 范围
`auth` `upload` `quiz` `mindmap` `dashboard` `ui` `db` `ai` `deps` `reader` `notes` `billing`

## Git 工作流

```
main           生产（Vercel 自动部署）
└── dev        开发集成
    ├── feat/* 新功能 → PR → dev
    ├── fix/*  修复 → PR → dev
    └── chore/* 杂项 → PR → dev
```

发布流程：`dev` 测试通过 → 发 PR 到 `main` → 打 tag。

## Husky 钩子

- **pre-commit**：lint-staged 自动格式化 + ESLint
- **commit-msg**：commitlint 校验 Conventional 规范

不符合规范的 commit 会被拦截。如需临时绕过：
```bash
git commit --no-verify -m "..."
```