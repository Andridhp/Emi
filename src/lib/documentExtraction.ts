export const DOCUMENT_EXTRACTION_SCHEMA_VERSION = '1.0';
export const MAX_EXTRACTED_FACTS = 100;

export type ExtractedFactProposal = {
  fieldName: string;
  rawValue: string;
  normalizedValue?: { value: string; unit?: string };
  confidence: number;
  pageNumber?: number;
};

export type DocumentExtractionPayload = {
  schemaVersion: typeof DOCUMENT_EXTRACTION_SCHEMA_VERSION;
  documentType: string;
  facts: ExtractedFactProposal[];
};

const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const clean = (value: unknown, limit: number) => typeof value === 'string' ? value.trim().slice(0, limit) : '';

export function validateDocumentExtraction(value: unknown): DocumentExtractionPayload {
  if (!object(value) || value.schemaVersion !== DOCUMENT_EXTRACTION_SCHEMA_VERSION) throw new Error('invalid_schema_version');
  const documentType = clean(value.documentType, 80);
  if (!documentType) throw new Error('document_type_required');
  if (!Array.isArray(value.facts) || value.facts.length > MAX_EXTRACTED_FACTS) throw new Error('invalid_fact_count');
  const facts = value.facts.map((candidate, index): ExtractedFactProposal => {
    if (!object(candidate)) throw new Error(`invalid_fact_${index}`);
    const fieldName = clean(candidate.fieldName, 80);
    const rawValue = clean(candidate.rawValue, 500);
    const confidence = typeof candidate.confidence === 'number' ? candidate.confidence : Number.NaN;
    const pageNumber = candidate.pageNumber === undefined ? undefined : Number(candidate.pageNumber);
    if (!fieldName || !/^[\p{L}\p{N}][\p{L}\p{N} _./()%+-]*$/u.test(fieldName)) throw new Error(`invalid_field_name_${index}`);
    if (!rawValue) throw new Error(`raw_value_required_${index}`);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error(`invalid_confidence_${index}`);
    if (pageNumber !== undefined && (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 10000)) throw new Error(`invalid_page_${index}`);
    let normalizedValue: ExtractedFactProposal['normalizedValue'];
    if (candidate.normalizedValue !== undefined) {
      if (!object(candidate.normalizedValue)) throw new Error(`invalid_normalized_value_${index}`);
      const normalized = clean(candidate.normalizedValue.value, 300);
      const unit = clean(candidate.normalizedValue.unit, 40);
      if (!normalized) throw new Error(`normalized_value_required_${index}`);
      normalizedValue = { value: normalized, ...(unit ? { unit } : {}) };
    }
    return { fieldName, rawValue, confidence, ...(pageNumber ? { pageNumber } : {}), ...(normalizedValue ? { normalizedValue } : {}) };
  });
  return { schemaVersion: DOCUMENT_EXTRACTION_SCHEMA_VERSION, documentType, facts };
}

export function factsForDatabase(payload: DocumentExtractionPayload) {
  return payload.facts.map((fact) => ({
    field_name: fact.fieldName,
    raw_value: fact.rawValue,
    normalized_value: fact.normalizedValue ?? null,
    confidence: fact.confidence,
    page_number: fact.pageNumber ?? null
  }));
}
