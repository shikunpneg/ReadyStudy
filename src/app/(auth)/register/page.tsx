'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerAction } from './actions';
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

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    setLoading(true);
    const r = await registerAction({ name, email, password });
    setLoading(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    // 自动登录
    await signIn('credentials', { email, password, redirect: false, callbackUrl: '/dashboard' });
    router.push('/dashboard');
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>注册 ReadyStudy</CardTitle>
        <CardDescription>填写下方信息创建账号</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {err ? <p className="text-sm text-destructive">{err}</p> : null}
        <div className="space-y-2">
          <Label htmlFor="name">昵称</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">密码（≥ 8 位）</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button className="w-full" disabled={loading} onClick={submit}>
          注册并登录
        </Button>
      </CardContent>
      <CardFooter>
        <Link href="/login" className="text-sm text-primary hover:underline">
          已有账号？去登录
        </Link>
      </CardFooter>
    </Card>
  );
}