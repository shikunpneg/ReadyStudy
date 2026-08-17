# ReadyStudy 部署文档（Vercel）

## 1. 准备工作

1. 注册/登录 [Vercel](https://vercel.com)
2. 在 GitHub 创建空仓库 `shikunpneg/ReadyStudy`（保持默认 main 分支）
3. 将本仓库推送到远端：
   ```bash
   git remote add origin https://github.com/shikunpneg/ReadyStudy.git
   git push -u origin main
   git push -u origin dev
   ```

## 2. 在 Vercel 创建项目

1. 打开 Vercel → New Project → 选择 `shikunpneg/ReadyStudy`
2. Framework Preset 自动识别为 **Next.js**
3. Root Directory 留空
4. **不要**勾选 Override 默认设置里的 `Output Directory`，因为我们用 Next.js 默认 `.next`

## 3. 配置环境变量

Vercel Project → Settings → Environment Variables，添加：

| 变量 | 说明 | 必填 |
|------|------|------|
| `AUTH_SECRET` | 任意 32+ 字符随机串 | ✅ |
| `AUTH_URL` | https://your-domain.vercel.app | ✅ |
| `EMAIL_FROM` | 发件人邮箱 | ❌（启用魔法链接时必填） |
| `AUTH_RESEND_KEY` | Resend API Key | ❌ |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth | ❌ |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth | ❌ |
| `POSTGRES_URL` | Vercel Postgres 连接串 | ✅ |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Vercel KV（Upstash Redis） | ✅ |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob | ✅ |
| `BYOK_ENC_KEY` | 64 位 hex 随机串（`openssl rand -hex 32`） | ✅ |

> BYOK_ENC_KEY 用于加密用户自带的 LLM Key，**务必妥善保管，丢失会导致所有用户的 API Key 无法解密**。

## 4. 启用 Vercel Storage

在 Vercel Project → Storage 标签页：
- **Create Database** → Postgres → 选 Region: Singapore
- **Create Database** → KV → 选 Region: Singapore
- **Create Store** → Blob → 默认

创建后会自动注入对应环境变量（`POSTGRES_URL` / `KV_REST_API_*` / `BLOB_READ_WRITE_TOKEN`）。

## 5. 数据库迁移

第一次部署完成后，本地执行：

```bash
# 拉取 Vercel 环境变量
vercel env pull .env.local

# 跑 Drizzle 迁移
pnpm db:push
```

## 6. 域名（可选）

Vercel Project → Settings → Domains，绑定自定义域名即可。

## 7. Stripe（暂不启用）

`.env.example` 已预留 Stripe 字段，未来启用付费时再补。

---

## 🆘 常见问题

### Q: 上传后状态一直是 "processing"？
A: 检查 `BLOB_READ_WRITE_TOKEN` 与 `KV_REST_API_*` 是否正确，看 Vercel Function 日志。

### Q: 出题报 "请先在设置页配置 API Key"？
A: 用户需登录后在 `/settings` 填入自己的 DeepSeek 或 OpenAI Key。

### Q: 部署区域？
A: `vercel.json` 已配置 Singapore（`sin1`），对中国大陆用户更友好。