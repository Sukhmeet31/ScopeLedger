import { createDocument } from '../shared/documents';
import { LIMITS, type DocumentInput } from '../shared/schema';

export function decodeText(buffer: ArrayBuffer): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
  catch { throw new Error('Save the text file as UTF-8 and try again.'); }
}
export function validatePdfPages(pages: string[]): string[] {
  if (!pages.length || pages.length > LIMITS.pages) throw new Error('Use a PDF with 1–30 pages.');
  const empty = pages.findIndex(p => !p.trim());
  if (empty >= 0) throw new Error(`Page ${empty + 1} has no readable text. Scanned or partially scanned PDFs need OCR first; paste verified text instead.`);
  return pages;
}
export async function readAgreement(file: File): Promise<DocumentInput> {
  if (file.size > LIMITS.fileBytes) throw new Error('Choose a file smaller than 10 MB.');
  let input: DocumentInput;
  if (/\.txt$/i.test(file.name)) input = { title: file.name, kind: 'text', pages: [decodeText(await file.arrayBuffer())] };
  else if (/\.pdf$/i.test(file.name)) {
    const pdfjs = await import('pdfjs-dist');
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    try {
      const pdf = await task.promise;
      if (pdf.numPages > LIMITS.pages) throw new Error('Use a PDF of at most 30 pages.');
      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        pages.push(content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').trim());
      }
      input = { title: file.name, kind: 'pdf', pages: validatePdfPages(pages) };
    } catch (error) {
      if (error instanceof Error && error.name === 'PasswordException') throw new Error('Password-protected PDFs are not supported. Paste verified text instead.');
      throw error;
    } finally { await task.destroy(); }
  } else throw new Error('Choose a UTF-8 TXT or text-based PDF file.');
  return (await createDocument(input)).input;
}

export function downloadText(filename: string, text: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
