import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDashboardStats } from '@/lib/stats';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const stats = await getDashboardStats(userId);
  return NextResponse.json(stats);
}