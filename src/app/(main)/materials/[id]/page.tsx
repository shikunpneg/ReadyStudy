import { auth } from '@/lib/auth';
import { requireUser } from '@/lib/guards';
import { db } from '@/lib/db';
import { materials, questions } from '@/lib/db/schema';
import { eq, and, count, desc } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, BrainCircuit, FileQuestion, PencilLine } from 'lucide-react';

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const userId = user.id;
  const { id } = await params;

  const [mat] = await db.select().from(materials).where(eq(materials.id, id));
  if (!mat || mat.userId !== userId) notFound();

  const [{ value: totalQ }] = await db
    .select({ value: count() })
    .from(questions)
    .where(eq(questions.materialId, id));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{mat.title}</h1>
        <p className="text-sm text-muted-foreground">
          {mat.type.toUpperCase()} · 状态：{mat.status}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <ActionCard
          href={`/materials/${id}/read`}
          icon={<BookOpen className="h-5 w-5" />}
          title="在线阅读"
          desc="分段阅读，边读边记笔记"
        />
        <ActionCard
          href={`/materials/${id}/quiz`}
          icon={<FileQuestion className="h-5 w-5" />}
          title={`智能出题（已生成 ${totalQ} 道）`}
          desc="7 种题型，立即开始答题"
        />
        <ActionCard
          href={`/materials/${id}/mindmap`}
          icon={<BrainCircuit className="h-5 w-5" />}
          title="知识导图"
          desc="可视化章节结构"
        />
        <ActionCard
          href={`/materials/${id}/notes`}
          icon={<PencilLine className="h-5 w-5" />}
          title="我的笔记"
          desc="管理本资料的笔记"
        />
      </div>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition hover:border-primary">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <span className="text-primary">{icon}</span>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>{desc}</CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}