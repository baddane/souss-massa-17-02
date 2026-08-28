// Parsing de CV 100% côté client, SANS LLM.
// - Extraction de texte : PDF (pdf.js) + Word .docx (mammoth) + .txt + images (OCR tesseract.js, FR).
// - Extraction de champs : voir `cvFields.ts` (regex + dictionnaires, logique pure et partagée).
// Les libs sont chargées en import dynamique → chunks séparés (n'alourdit pas le bundle du site public).
// L'OCR télécharge un pack de langue FR au 1er usage et prend quelques secondes par image.

import { parseFields, type ParsedCv } from './cvFields';

// Re-export pour ne pas casser les imports existants (`cvthequeService`,
// `candidateService`) : le point d'entree du parsing reste ce fichier.
export { parseFields };
export type { ParsedCv };

// ---------- Extraction du texte ----------
export async function extractText(file: File): Promise<{ text: string; supported: boolean }> {
  const name = file.name.toLowerCase();
  const type = file.type;

  // .txt
  if (type === 'text/plain' || name.endsWith('.txt')) {
    return { text: await file.text(), supported: true };
  }

  // PDF
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    const pdfjs: any = await import('pdfjs-dist');
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it: any) => it.str).join(' ') + '\n';
    }
    return { text, supported: true };
  }

  // Word .docx
  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    const mod: any = await import('mammoth/mammoth.browser.js');
    const mammoth = mod.default || mod;
    const buf = await file.arrayBuffer();
    const res = await mammoth.extractRawText({ arrayBuffer: buf });
    return { text: res.value || '', supported: true };
  }

  // Images : OCR via tesseract.js (moteur OCR, PAS un LLM). Charge un pack de langue FR
  // au 1er usage (téléchargé depuis le CDN tesseract). Lent (quelques s/image).
  if (type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif|tiff?)$/i.test(name)) {
    try {
      const mod: any = await import('tesseract.js');
      const recognize = mod.recognize || mod.default?.recognize;
      const { data } = await recognize(file, 'fra');
      const text = (data?.text || '').trim();
      return { text, supported: text.length > 0 };
    } catch {
      return { text: '', supported: false };
    }
  }

  // Ancien .doc et formats inconnus : pas d'extraction → saisie manuelle
  return { text: '', supported: false };
}

// Extraction complète (texte + champs) pour un fichier
export async function parseCvFile(file: File): Promise<{ parsed: ParsedCv; supported: boolean }> {
  const { text, supported } = await extractText(file);
  const parsed = parseFields(text);
  return { parsed, supported };
}
