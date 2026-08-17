/**
 * Stripe 服务端客户端（懒加载）。
 * 仅在 STRIPE_SECRET_KEY 配置时才实例化。
 */
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY 未配置。付费功能尚未启用，请忽略此错误。',
    );
  }
  _stripe = new Stripe(key, {
    apiVersion: '2024-10-28.acacia',
    typescript: true,
  });
  return _stripe;
}

/**
 * 创建一个 Stripe Checkout Session。
 */
export async function createCheckoutSession(opts: {
  customerId?: string;
  priceId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const stripe = getStripe();
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: opts.priceId, quantity: 1 }],
    customer: opts.customerId,
    client_reference_id: opts.userId,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    allow_promotion_codes: true,
  });
}

export async function createCustomerPortal(opts: {
  customerId: string;
  returnUrl: string;
}) {
  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({
    customer: opts.customerId,
    return_url: opts.returnUrl,
  });
}

/**
 * 获取或创建与用户绑定的 Stripe Customer。
 * （生产中应存到 user_settings 表，schema 中预留了字段位）
 */
export async function ensureCustomer(email: string, name?: string | null) {
  const stripe = getStripe();
  const list = await stripe.customers.list({ email, limit: 1 });
  if (list.data.length) return list.data[0];
  return stripe.customers.create({ email, name: name ?? undefined });
}