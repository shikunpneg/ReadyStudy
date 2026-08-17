import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Resend from 'next-auth/providers/resend';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users, accounts, sessions, verificationTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: 'jwt' }, // 邮箱密码登录需 JWT
  pages: {
    signIn: '/login',
    verifyRequest: '/verify',
  },
  providers: [
    // 1) 魔法链接（Resend / 自定义 SMTP，未配置时禁用）
    ...(process.env.EMAIL_SERVER_HOST
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
    // 3) 邮箱密码
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        if (!creds?.email || !creds.password) return null;
        const [u] = await db.select().from(users).where(eq(users.email, String(creds.email)));
        if (!u || !u.hashedPassword) return null;
        const ok = await bcrypt.compare(String(creds.password), u.hashedPassword);
        if (!ok) return null;
        return { id: u.id, email: u.email, name: u.name, image: u.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.sub && session.user) (session.user as { id: string }).id = token.sub;
      return session;
    },
  },
});