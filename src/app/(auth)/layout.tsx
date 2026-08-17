import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/30 px-4">
      <Link href="/" className="mb-6 flex items-center gap-2 text-xl font-semibold">
        <span className="inline-block h-8 w-8 rounded-md bg-primary" />
        ReadyStudy
      </Link>
      {children}
    </div>
  );
}