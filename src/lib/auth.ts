import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Resend from 'next-auth/providers/resend';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * ReadyStudy Auth.js v5 配置。
 *
 * 设计选择：**JWT session + 自管 users 表 + 自管密码**。
 *   - 不使用 DrizzleAdapter 的 sessions 表（与 Credentials provider 不兼容）
 *   - 用 JWT 存 user.id，所有 server 端用 auth() 拿 session
 *   - OAuth + 魔法链接保留 adapter fallback（仅用于 user 自动创建）
 *
 * 如需启用 OAuth 用户自动创建到 users 表：把 DrizzleAdapter 加回并切到 'database' 策略。
 */

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    verifyRequest: '/verify',
  },
  providers: [
    // 1) 魔法链接（Resend，未配置时禁用）
    ...(process.env.AUTH_RESEND_KEY || process.env.EMAIL_SERVER_HOST
      ? [
          Resend({
            from: process.env.EMAIL_FROM,
            apiKey: process.env.AUTH_RESEND_KEY,
          }),
        ]
      : []),
    // 2) OAuth
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
      ? [GitHub]
      : []),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [Google]
      : []),
    // 3) 邮箱密码（主流程）
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? '').trim().toLowerCase();
        const password = String(creds?.password ?? '');
        if (!email || !password) return null;
        const [u] = await db.select().from(users).where(eq(users.email, email));
        if (!u || !u.hashedPassword) return null;
        const ok = await bcrypt.compare(password, u.hashedPassword);
        if (!ok) return null;
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          image: u.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // user 只在 signIn / signUp 后第一次 callback 里有
      if (user?.id) {
        token.sub = user.id;
        token.email = user.email ?? undefined;
        token.name = user.name ?? undefined;
      }
      // 后续每次请求 token 都存在，确保 sub 是 user.id
      if (!token.sub && token.email) {
        // 兜底：通过 email 反查 id（罕见，比如 token 损坏）
        const [u] = await db.select().from(users).where(eq(users.email, String(token.email)));
        if (u) token.sub = u.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id: string }).id = token.sub;
      }
      if (session.user && token.email) {
        session.user.email = token.email as string;
      }
      if (session.user && token.name) {
        session.user.name = token.name as string;
      }
      return session;
    },
  },
});