import { DocumentField, DocumentRecord, FamilyEvent } from '@/types/domain';

export function documentsForProfile(documents: DocumentRecord[], profileId: string) {
  return documents.filter((document) => (document.profileId ?? 'emilia') === profileId);
}

export function documentForProfile(documents: DocumentRecord[], id: string, profileId: string) {
  return documentsForProfile(documents, profileId).find((document) => document.id === id);
}

const field = (id: string, label: string, value: string, confidence: DocumentField['confidence'], sourcePage = 1): DocumentField => ({ id, label, value, rawValue: value, confidence, sourcePage, selected: confidence !== 'low' });

export function proposeDocumentFields(document: DocumentRecord): DocumentField[] {
  const name = document.name.toLocaleLowerCase('es-MX');
  if (name.includes('ultrasonido')) return [field('gestational-age', 'Edad gestacional', '22 semanas + 3 días', 'high'), field('estimated-weight', 'Peso fetal estimado', '510 g', 'medium'), field('placenta', 'Placenta', 'Posterior', 'medium', 2)];
  if (name.includes('laboratorio')) return [field('study-date', 'Fecha del estudio', document.date, 'high'), field('hemoglobin', 'Hemoglobina', 'Dato por confirmar', 'low'), field('study-type', 'Tipo de estudio', 'Laboratorio prenatal', 'medium')];
  if (name.includes('vacun')) return [field('bcg', 'BCG', 'Registrada', 'medium'), field('hepatitis-b', 'Hepatitis B', 'Registrada', 'medium')];
  return [field('document-date', 'Fecha del documento', document.date, 'medium'), field('document-type', 'Tipo de documento', document.mimeType?.includes('pdf') ? 'Informe PDF' : 'Imagen médica', 'medium')];
}

export function confirmedFieldSummaries(fields: DocumentField[]) {
  return fields.filter((item) => item.selected && item.value.trim()).map((item) => `${item.label}: ${item.value.trim()}`);
}

export function confirmedDocumentEvents(documents: DocumentRecord[]): FamilyEvent[] {
  return documents.filter((document) => document.status === 'reviewed' && document.extracted.length > 0 && document.profileId).map((document) => ({
    id: `document-event-${document.id}`,
    profileId: document.profileId!,
    kind: document.profileId === 'pregnancy' ? 'prenatal' : document.name.toLocaleLowerCase('es-MX').includes('vacun') ? 'medicine' : 'growth',
    title: document.name,
    detail: document.extracted.join(' · '),
    occurredAt: document.occurredAt ?? new Date().toISOString(),
    source: 'document'
  }));
}

const numericValue = (value: string) => {
  const match = value.replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
};

export interface DocumentaryComparison {
  fieldLabel: string; previous: string; current: string; previousDocument: string; currentDocument: string;
  statement: string;
}

export function compareConfirmedDocumentFields(documents: DocumentRecord[], profileId: string): DocumentaryComparison[] {
  const confirmed = documentsForProfile(documents, profileId)
    .filter((document) => document.analysisStatus === 'confirmed' && document.extractedFields?.length)
    .sort((a, b) => +new Date(a.occurredAt ?? 0) - +new Date(b.occurredAt ?? 0));
  const byLabel = new Map<string, { value: string; document: string }[]>();
  confirmed.forEach((document) => document.extractedFields!.filter((item) => item.selected).forEach((item) => {
    const list = byLabel.get(item.label) ?? [];
    list.push({ value: item.value, document: document.name }); byLabel.set(item.label, list);
  }));
  return [...byLabel.entries()].flatMap(([fieldLabel, values]) => {
    if (values.length < 2) return [];
    const previous = values.at(-2)!; const current = values.at(-1)!;
    if (numericValue(previous.value) === undefined || numericValue(current.value) === undefined) return [];
    return [{ fieldLabel, previous: previous.value, current: current.value, previousDocument: previous.document, currentDocument: current.document, statement: `${fieldLabel} cambió de ${previous.value} a ${current.value} entre dos documentos confirmados.` }];
  });
}
