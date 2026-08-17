import pdfParse from 'pdf-parse';

export async function parsePdf(buf: Buffer): Promise<string> {
  const res = await pdfParse(buf);
  return res.text;
}