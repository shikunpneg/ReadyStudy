/**
 * PPTX 解析：纯 JS 方案，避免依赖 Python。
 * PPTX 本质是 zip + XML，遍历 ppt/slides/slide*.xml 抽取所有 <a:t> 文本。
 */
import JSZip from 'jszip';

export async function parsePptx(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const slideFiles = Object.keys(zip.files)
    .filter((k) => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
    .sort();

  const parts: string[] = [];
  for (const name of slideFiles) {
    const xml = await zip.files[name].async('string');
    const texts: string[] = [];
    const re = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
    let m;
    while ((m = re.exec(xml))) {
      texts.push(decodeXmlEntities(m[1]));
    }
    const slideNo = name.match(/slide(\d+)\.xml/i)?.[1];
    parts.push(`【幻灯片 ${slideNo}】\n${texts.join('\n')}`);
  }

  // 备注
  const noteFiles = Object.keys(zip.files).filter((k) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/i.test(k));
  for (const name of noteFiles) {
    const xml = await zip.files[name].async('string');
    const texts: string[] = [];
    const re = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
    let m;
    while ((m = re.exec(xml))) texts.push(decodeXmlEntities(m[1]));
    if (texts.length) {
      const no = name.match(/notesSlide(\d+)\.xml/i)?.[1];
      parts.push(`【备注 ${no}】\n${texts.join('\n')}`);
    }
  }

  return parts.join('\n\n');
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}