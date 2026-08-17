'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const callbackUrl = sp.get('callbackUrl') ?? '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function doCredentials() {
    setErr(null);
    setLoading(true);
    const res = await signIn('credentials', { email, password, redirect: false, callbackUrl });
    setLoading(false);
    if (res?.error) setErr('邮箱或密码错误');
    else router.push(callbackUrl);
  }

  async function doMagicLink() {
    setErr(null);
    setLoading(true);
    const res = await signIn('resend', { email, redirect: false, callbackUrl });
    setLoading(false);
    if (res?.error) setErr('发送失败，请稍后再试');
    else setMagicSent(true);
  }

  async function doOAuth(provider: 'github' | 'google') {
    setLoading(true);
    await signIn(provider, { callbackUrl });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>登录 ReadyStudy</CardTitle>
        <CardDescription>选择以下任一方式登录</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {magicSent ? (
          <p className="rounded-md bg-primary-50 p-3 text-sm text-primary-700">
            ✉️ 登录链接已发送至 <b>{email}</b>，请查收邮箱。
          </p>
        ) : null}
        {err ? <p className="text-sm text-destructive">{err}</p> : null}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={loading} onClick={() => doOAuth('github')}>
            GitHub
          </Button>
          <Button variant="outline" disabled={loading} onClick={() => doOAuth('google')}>
            Google
          </Button>
        </div>

        <div className="relative my-2 flex items-center">
          <div className="flex-1 border-t" />
          <span className="px-2 text-xs text-muted-foreground">或</span>
          <div className="flex-1 border-t" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button className="w-full" disabled={loading || !email || !password} onClick={doCredentials}>
          邮箱密码登录
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          disabled={loading || !email}
          onClick={doMagicLink}
        >
          发送魔法链接到邮箱
        </Button>
      </CardContent>
      <CardFooter className="justify-between text-sm">
        <Link href="/register" className="text-primary hover:underline">
          注册账号
        </Link>
        <Link href="/" className="text-muted-foreground hover:underline">
          返回首页
        </Link>
      </CardFooter>
    </Card>
  );
}