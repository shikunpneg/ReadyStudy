import { redirect } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';
import Link from 'next/link';
import { LayoutDashboard, BookOpen, Upload, BrainCircuit, FileQuestion, Settings, LogOut, ListChecks } from 'lucide-react';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const nav = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/materials', label: '我的资料', icon: BookOpen },
    { href: '/upload', label: '上传资料', icon: Upload },
    { href: '/quiz', label: '答题', icon: ListChecks },
    { href: '/wrong-questions', label: '错题本', icon: FileQuestion },
    { href: '/settings', label: '设置', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 flex-col border-r bg-card md:flex">
        <Link href="/dashboard" className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
          <span className="inline-block h-6 w-6 rounded bg-primary" />
          ReadyStudy
        </Link>
        <nav className="flex-1 space-y-1 p-2">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-secondary"
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/' });
          }}
          className="border-t p-2"
        >
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </form>
      </aside>

      <main className="flex-1">
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
          <span className="font-semibold">ReadyStudy</span>
          <span className="text-sm text-muted-foreground">{session.user.email}</span>
        </header>
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </main>
    </div>
  );
}