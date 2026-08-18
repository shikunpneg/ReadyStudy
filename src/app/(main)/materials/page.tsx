import { auth } from '@/lib/auth';
import { requireUser } from '@/lib/guards';
import { db } from '@/lib/db';
import { materials } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatBytes, formatDate } from '@/lib/utils';
import { Plus } from 'lucide-react';

export default async function MaterialsPage() {
  const user = await requireUser();
  const userId = user.id;
  const list = await db
    .select()
    .from(materials)
    .where(eq(materials.userId, userId))
    .orderBy(desc(materials.createdAt));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">我的资料</h1>
        <Link href="/upload">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            上传新资料
          </Button>
        </Link>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">还没有资料，去上传你的第一份学习材料吧</p>
            <Link href="/upload" className="mt-4">
              <Button>立即上传</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map((m) => (
            <Link key={m.id} href={`/materials/${m.id}`}>
              <Card className="h-full transition hover:border-primary">
                <CardHeader>
                  <CardTitle className="line-clamp-1 text-base">{m.title}</CardTitle>
                  <CardDescription>
                    {m.type.toUpperCase()} · {formatBytes(m.sizeBytes)} · {formatDate(m.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StatusBadge status={m.status} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ready: { label: '已就绪', cls: 'bg-primary-50 text-primary-700' },
    processing: { label: '处理中…', cls: 'bg-yellow-50 text-yellow-700' },
    failed: { label: '失败', cls: 'bg-red-50 text-red-700' },
    uploaded: { label: '待处理', cls: 'bg-secondary text-muted-foreground' },
  };
  const s = map[status] ?? map.uploaded;
  return <span className={`inline-block rounded px-2 py-1 text-xs ${s.cls}`}>{s.label}</span>;
}