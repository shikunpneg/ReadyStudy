import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateMindmap } from '@/lib/mindmap';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { materialId } = (await req.json()) as { materialId: string };
  if (!materialId) return NextResponse.json({ error: 'materialId required' }, { status: 400 });

  try {
    const structure = await generateMindmap(userId, materialId);
    return NextResponse.json({ ok: true, structure });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}