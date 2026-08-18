/**
 * 鉴权守卫工具。
 *  - requireUser: 必须登录，否则重定向到 /login
 *  - getOptionalUser: 拿当前用户（可能为 null）
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export async function requireUser() {
  const session = await auth();
  if (!session?.user || !(session.user as { id?: string }).id) {
    redirect('/login');
  }
  return session.user as { id: string; email?: string | null; name?: string | null };
}

export async function getOptionalUser() {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id
    ? (session!.user as { id: string })
    : null;
}