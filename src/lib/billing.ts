/**
 * Stripe 付费接口（暂未启用）
 *
 * 此模块实现 Stripe Checkout + Webhook + Customer Portal 的最小骨架。
 * 当未来启用付费功能时：
 *   1) 在 .env 填入 STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
 *   2) 在 Stripe Dashboard 创建产品（ReadyStudy Pro）并把 priceId 填入 STRIPE_PRO_PRICE_ID
 *   3) 把 routes/billing.ts 移出 .disabled 注释
 *   4) 在 settings 页增加「升级 Pro」按钮
 */

export const STRIPE_CONFIG = {
  proPriceId: process.env.STRIPE_PRO_PRICE_ID || 'price_xxx',
  successUrl: '/settings?upgraded=true',
  cancelUrl: '/settings?upgraded=false',
} as const;

/**
 * 套餐限制（用于前端按 plan 限制功能）
 */
export const PLAN_LIMITS = {
  free: {
    maxMaterials: 5,         // 最多上传 5 份资料
    maxQuestionsPerMonth: 200,// 每月最多 200 道题
    features: ['pdf', 'txt'], // 免费用户支持的资料格式
    label: 'Free',
  },
  pro: {
    maxMaterials: Infinity,
    maxQuestionsPerMonth: Infinity,
    features: ['pdf', 'txt', 'pptx', 'docx', 'audio', 'video'],
    label: 'Pro',
  },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

/**
 * 判断当前 plan 是否可以使用某项功能
 */
export function canUseFeature(plan: Plan, feature: keyof typeof PLAN_LIMITS.free): boolean {
  return PLAN_LIMITS[plan].features.includes(feature as never);
}

export function canUploadMore(plan: Plan, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].maxMaterials;
}

export function canGenerateMore(plan: Plan, monthlyCount: number): boolean {
  return monthlyCount < PLAN_LIMITS[plan].maxQuestionsPerMonth;
}