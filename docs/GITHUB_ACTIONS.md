# GitHub Actions 自动部署指南

本项目配置了 3 个 workflow：

| Workflow                | 触发时机              | 作用                       |
| ----------------------- | --------------------- | -------------------------- |
| `ci.yml`                | push / PR 到 main/dev | lint + typecheck + build   |
| `deploy-preview.yml`    | PR 打开/更新          | Vercel 预览部署，评论到 PR |
| `deploy-production.yml` | push 到 main          | Vercel 生产部署            |

## 配置 Secrets

GitHub 仓库 → Settings → Secrets and variables → Actions → **New repository secret**

需要 3 个 secret：

### VERCEL_TOKEN

1. 访问 https://vercel.com/account/tokens
2. Create Token → Name: `github-actions` → Scope: Full Account
3. 复制 token 值

### VERCEL_ORG_ID

1. Vercel Project → Settings → General
2. 顶部"Your Team ID" — 形如 `team_xxxxx`

### VERCEL_PROJECT_ID

1. Vercel Project → Settings → General
2. "Project ID" — 形如 `prj_xxxxx`

## 启用 Vercel GitHub App（可选）

如果不走 GitHub Actions 部署，Vercel 自己的 GitHub Integration 也可以：

- https://vercel.com/dashboard → Settings → Git → Connect Git Repository
- 之后 PR 自动生成预览，push 到 main 自动部署生产

## 工作流细节

### CI 工作流（每次 push / PR）

- 跑在 ubuntu-latest
- pnpm 安装（lockfile 严格模式）
- typecheck + lint + format:check + build
- 失败会阻止 merge

### Preview 部署（PR）

- 每次 PR 更新自动部署
- 评论会自动更新（不重复刷屏）
- URL 形如 `readystudy-pr-123-username.vercel.app`

### Production 部署（push main）

- 手动合并 PR 到 main 后触发
- `environment: production` 表示需要 maintainer 在 Settings → Environments 配置审批
- 部署前可加 manual approval

## 状态徽章（README 顶部）

```markdown
[![CI](https://github.com/shikunpneg/ReadyStudy/actions/workflows/ci.yml/badge.svg)](https://github.com/shikunpneg/ReadyStudy/actions/workflows/ci.yml)
```

## 故障排查

### "Error: You don't have access to the project"

→ 检查 `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` 是否正确

### "Token not valid"

→ 重新生成 `VERCEL_TOKEN`，注意 Scope 应为 Full Account

### PR 评论没出现

→ 检查 `marocchino/sticky-pull-request-comment` 权限，需要 `pull-requests: write`
