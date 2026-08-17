import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">找不到这个页面</p>
      <Link href="/">
        <Button>返回首页</Button>
      </Link>
    </div>
  );
}