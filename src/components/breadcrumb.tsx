import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export interface Crumb {
  href?: string;
  label: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
      <Link href="/dashboard" className="hover:text-primary">
        首页
      </Link>
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronLeft className="h-3 w-3 rotate-180" />
          {c.href ? (
            <Link href={c.href} className="hover:text-primary">
              {c.label}
            </Link>
          ) : (
            <span>{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function BackLink({ href, label }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
    >
      <ChevronLeft className="h-4 w-4" />
      {label ?? '返回'}
    </Link>
  );
}