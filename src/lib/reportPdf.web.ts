import type { ConsultationReportData } from '@/lib/report';
import { buildConsultationText } from '@/lib/report';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const LEFT = 48;
const TOP = 54;
const BOTTOM = 52;
const FONT_SIZE = 11;
const LINE_HEIGHT = 15;
const MAX_CHARS = 85;

export const consultationPdfFileName = (profileName: string, date = new Date()) => {
  const safeName = profileName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'familia';
  return `emi-resumen-${safeName}-${date.toISOString().slice(0, 10)}.pdf`;
};

const escapePdfText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const wrapLine = (value: string) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) { current = word; continue; }
    if ((current + ' ' + word).length <= MAX_CHARS) current += ` ${word}`;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines;
};

function makePages(text: string) {
  const rawLines = text.split('\n').flatMap((line) => (line ? wrapLine(line) : ['']));
  const usableLinesPerPage = Math.floor((PAGE_HEIGHT - TOP - BOTTOM) / LINE_HEIGHT) - 1;
  const pages: string[][] = [];
  let page: string[] = [];
  for (const line of rawLines) {
    if (page.length >= usableLinesPerPage) { pages.push(page); page = []; }
    page.push(line);
  }
  if (page.length) pages.push(page);
  return pages.length ? pages : [['']];
}

export function buildConsultationPdf(report: ConsultationReportData): Uint8Array {
  const text = buildConsultationText(report);
  const pages = makePages(text);
  const objects: string[] = [];

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  const pageObjectNumbers: number[] = [];
  let nextObjectNumber = 4;
  for (const pageLines of pages) {
    const contentObject = nextObjectNumber + 1;
    const pageObject = nextObjectNumber;
    pageObjectNumbers.push(pageObject);
    const streamLines = [
      'BT',
      `/F1 ${FONT_SIZE} Tf`,
      `${LEFT} ${PAGE_HEIGHT - TOP} Td`,
      ...pageLines.flatMap((line, index) => {
        const safe = escapePdfText(line || ' ');
        return index === 0
          ? [`(${safe}) Tj`]
          : ['T*', `(${safe}) Tj`];
      }),
      'ET'
    ];
    const stream = streamLines.join('\n');
    objects[contentObject] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageObject] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObject} 0 R >>`;
    nextObjectNumber += 2;
  }

  objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(' ')}] /Count ${pageObjectNumbers.length} >>`;

  const chunks: Uint8Array[] = [];
  const encoder = new TextEncoder();
  let offset = 0;
  const offsets: number[] = [0];
  const push = (value: string) => {
    const bytes = encoder.encode(value);
    chunks.push(bytes);
    offset += bytes.length;
  };

  push('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
  for (let i = 1; i < objects.length; i += 1) {
    if (!objects[i]) continue;
    offsets[i] = offset;
    push(`${i} 0 obj\n${objects[i]}\nendobj\n`);
  }

  const xrefStart = offset;
  push(`xref\n0 ${objects.length}\n`);
  push('0000000000 65535 f \n');
  for (let i = 1; i < objects.length; i += 1) {
    if (!objects[i]) continue;
    push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  push(`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

  const total = chunks.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let cursor = 0;
  for (const part of chunks) { result.set(part, cursor); cursor += part.length; }
  return result;
}

export function downloadConsultationPdf(bytes: Uint8Array, fileName: string) {
  if (typeof document === 'undefined') return false;
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
