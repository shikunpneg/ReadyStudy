import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect('/dashboard');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="mb-3 text-4xl font-bold tracking-tight md:text-5xl">ReadyStudy</h1>
      <p className="mb-8 max-w-xl text-balance text-lg text-muted-foreground">
        上传你的电子书、PPT、文档，AI 自动出题。用自己的资料，答出自己的理解。
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary-700"
        >
          开始使用
        </Link>
        <Link
          href="/register"
          className="inline-flex h-11 items-center rounded-md border px-6 text-sm font-medium hover:bg-secondary"
        >
          注册账号
        </Link>
      </div>
      <div className="mt-12 grid max-w-3xl gap-4 text-left md:grid-cols-3">
        <Feature title="📤 多格式支持" desc="PDF / TXT / PPTX / DOCX 一并支持，自动切片入库。" />
        <Feature title="🧠 AI 智能出题" desc="7 种题型：单选、多选、判断、填空、简答、名词解释、论述。" />
        <Feature title="📊 学习看板" desc="答题曲线 + 知识点雷达图 + 错题本，温故知新。" />
      </div>
    </main>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-1 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}