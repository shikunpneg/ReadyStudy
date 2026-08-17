# 付费功能启用指南

> 当前版本免费，付费功能代码已就绪但**默认禁用**（文件名以 `.disabled` 结尾）。

## 启用步骤

### 1. 注册 Stripe 账号
- 访问 https://dashboard.stripe.com/register
- 完成实名认证（个人/企业均可）

### 2. 创建产品
- 进入 Products → Add product
- Name: `ReadyStudy Pro`
- Pricing model: `Recurring`（订阅）
- Price: `¥29.00 / Monthly`
- 复制 Price ID（形如 `price_1Nxxxxx`）

### 3. 配置环境变量
在 Vercel Project → Settings → Environment Variables 添加：

| 变量 | 值 |
|------|---|
| `STRIPE_SECRET_KEY` | `sk_test_...`（测试）或 `sk_live_...`（生产） |
| `STRIPE_WEBHOOK_SECRET` | Webhook 端点的签名密钥（见步骤 4） |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` 或 `pk_live_...` |
| `STRIPE_PRO_PRICE_ID` | 步骤 2 复制的 Price ID |

### 4. 配置 Webhook
- Stripe Dashboard → Developers → Webhooks → Add endpoint
- Endpoint URL: `https://your-domain.vercel.app/api/billing/webhook`
- Events to send:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- 复制 Signing secret → 填入 `STRIPE_WEBHOOK_SECRET`

### 5. 启用代码
```bash
# 在项目根目录执行
mv src/app/api/billing/checkout/route.ts.disabled \
   src/app/api/billing/checkout/route.ts

mv src/app/api/billing/portal/route.ts.disabled \
   src/app/api/billing/portal/route.ts

mv src/app/api/billing/webhook/route.ts.disabled \
   src/app/api/billing/webhook/route.ts

mv "src/app/(main)/billing/page.tsx.disabled" \
   "src/app/(main)/billing/page.tsx"

mv "src/app/(main)/billing/checkout-button.tsx.disabled" \
   "src/app/(main)/billing/checkout-button.tsx"
```

### 6. 添加导航入口
在 `src/app/(main)/layout.tsx` 的 nav 数组加：
```tsx
{ href: '/billing', label: '升级 Pro', icon: CreditCard },
```

### 7. 在用户层加限制
参考 `src/lib/billing.ts` 中的 `canUseFeature` / `canUploadMore` / `canGenerateMore`：

```tsx
import { canUploadMore } from '@/lib/billing';

// 在上传前
if (!canUploadMore(user.plan, materials.length)) {
  router.push('/billing');
  return;
}
```

### 8. 部署
```bash
git add .
git commit -m "feat(billing): enable Stripe checkout + portal + webhook"
git push
```

Vercel 自动部署。

## 测试卡号

Stripe 测试模式：
- 卡号：`4242 4242 4242 4242`
- 过期：任意未来日期
- CVC：任意 3 位数

## 文件清单

启用后会有这些文件：
- `src/lib/billing.ts` — 套餐限制定义（已启用）
- `src/lib/billing/stripe.server.ts` — Stripe 客户端（已启用）
- `src/app/api/billing/checkout/route.ts` — 启用后
- `src/app/api/billing/portal/route.ts` — 启用后
- `src/app/api/billing/webhook/route.ts` — 启用后
- `src/app/(main)/billing/page.tsx` — 启用后
- `src/app/(main)/billing/checkout-button.tsx` — 启用后