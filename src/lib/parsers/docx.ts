import mammoth from 'mammoth';

export async function parseDocx(buf: Buffer): Promise<string> {
  const res = await mammoth.extractRawText({ buffer: buf });
  return res.value;
}