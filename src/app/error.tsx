'use client';

import { Button } from '@/components/ui/button';

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <h2 className="text-lg font-semibold">出错了</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>重试</Button>
    </div>
  );
}