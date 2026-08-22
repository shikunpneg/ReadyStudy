/**
 * 取资料的原始文件（base64），用于沉浸式阅读器渲染。
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/guards';
import { db } from '@/lib/db';
import { materials } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await ctx.params;

  const [mat] = await db.select().from(materials).where(eq(materials.id, id));
  if (!mat || mat.userId !== user.id) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (!mat.fileData) {
    return NextResponse.json(
      { error: '本资料未保存原始文件（可能是早期上传）' },
      { status: 404 },
    );
  }

  // base64 → Buffer
  const buffer = Buffer.from(mat.fileData, 'base64');
  const contentType = mimeFor(mat.type);

  // 直接返回二进制流（前端用 blob URL 渲染）
  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

function mimeFor(type: string): string {
  switch (type) {
    case 'pdf':
      return 'application/pdf';
    case 'epub':
      return 'application/epub+zip';
    case 'mobi':
      return 'application/x-mobipocket-ebook';
    case 'html':
      return 'text/html; charset=utf-8';
    case 'md':
    case 'txt':
      return 'text/plain; charset=utf-8';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    default:
      return 'application/octet-stream';
  }
}