import { BirthRecord, Caregiver, ConsultationQuestion, ConsentPreferences, DocumentRecord, FamilyEvent, FamilyProfile, PostpartumRecord, PrenatalRecord } from '@/types/domain';

export type PortableDocumentRecord = Omit<DocumentRecord, 'uri' | 'cloudId' | 'storagePath' | 'processingJobId'>;

export type PortableFamilyExport = {
  format: 'emilia-family-export';
  schemaVersion: '1.0' | '1.1';
  exportedAt: string;
  notice: string;
  profiles: FamilyProfile[];
  caregivers: Caregiver[];
  prenatalRecords: PrenatalRecord[];
  birthRecords: BirthRecord[];
  postpartumRecords: PostpartumRecord[];
  events: FamilyEvent[];
  documents: PortableDocumentRecord[];
  consultationQuestions: ConsultationQuestion[];
  activeProfileId?: string;
  lastConsultationDates?: Record<string, string>;
  consentPreferences: ConsentPreferences;
};

export function createPortableFamilyExport(input: {
  profiles: FamilyProfile[];
  caregivers: Caregiver[];
  prenatalRecords: Record<string, PrenatalRecord>;
  birthRecords?: Record<string, BirthRecord>;
  postpartumRecords?: Record<string, PostpartumRecord>;
  events: FamilyEvent[];
  documents: DocumentRecord[];
  consultationQuestions?: ConsultationQuestion[];
  activeProfileId?: string;
  lastConsultationDates?: Record<string, string>;
  consentPreferences: ConsentPreferences;
  exportedAt?: Date;
}): PortableFamilyExport {
  return {
    format: 'emilia-family-export',
    schemaVersion: '1.1',
    exportedAt: (input.exportedAt ?? new Date()).toISOString(),
    notice: 'Copia solicitada por la familia. No es un expediente médico ni contiene los archivos binarios originales.',
    profiles: input.profiles.map((profile) => ({ ...profile })),
    caregivers: input.caregivers.map((caregiver) => ({ ...caregiver, profileAccess: { ...(caregiver.profileAccess ?? {}) } })),
    prenatalRecords: Object.values(input.prenatalRecords).map((record) => ({ ...record })),
    birthRecords: Object.values(input.birthRecords ?? {}).map((record) => ({ ...record })),
    postpartumRecords: Object.values(input.postpartumRecords ?? {}).map((record) => ({ ...record })),
    events: input.events.map((event) => ({ ...event, data: event.data ? { ...event.data } : undefined })),
    documents: input.documents.map(({ uri: _privateDevicePath, cloudId: _cloudId, storagePath: _storagePath, processingJobId: _jobId, ...metadata }) => ({ ...metadata })),
    consultationQuestions: (input.consultationQuestions ?? []).map((question) => ({ ...question })),
    activeProfileId: input.activeProfileId,
    lastConsultationDates: { ...(input.lastConsultationDates ?? {}) },
    consentPreferences: { ...input.consentPreferences }
  };
}

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const array = (value: unknown) => Array.isArray(value);

export function parsePortableFamilyExport(json: string): PortableFamilyExport {
  if (json.length > 10_000_000) throw new Error('El respaldo supera el límite de 10 MB.');
  let value: unknown;
  try { value = JSON.parse(json); } catch { throw new Error('El archivo no contiene JSON válido.'); }
  if (!record(value) || value.format !== 'emilia-family-export' || !['1.0', '1.1'].includes(String(value.schemaVersion))) throw new Error('El archivo no es un respaldo compatible de Emi.');
  const requiredArrays = ['profiles', 'caregivers', 'prenatalRecords', 'events', 'documents'];
  if (requiredArrays.some((key) => !array(value[key]))) throw new Error('El respaldo está incompleto o dañado.');
  const profiles = value.profiles as unknown[];
  if (profiles.some((item) => !record(item) || typeof item.id !== 'string' || typeof item.name !== 'string' || !['child', 'pregnancy'].includes(String(item.stage)))) throw new Error('El respaldo contiene perfiles no válidos.');
  const events = value.events as unknown[];
  if (events.some((item) => !record(item) || typeof item.id !== 'string' || typeof item.profileId !== 'string' || typeof item.occurredAt !== 'string')) throw new Error('El respaldo contiene registros no válidos.');
  const documents = value.documents as unknown[];
  if (documents.some((item) => !record(item) || typeof item.id !== 'string' || typeof item.name !== 'string')) throw new Error('El respaldo contiene documentos no válidos.');
  return {
    ...(value as unknown as PortableFamilyExport),
    schemaVersion: String(value.schemaVersion) as PortableFamilyExport['schemaVersion'],
    birthRecords: array(value.birthRecords) ? value.birthRecords as BirthRecord[] : [],
    postpartumRecords: array(value.postpartumRecords) ? value.postpartumRecords as PostpartumRecord[] : [],
    consultationQuestions: array(value.consultationQuestions) ? value.consultationQuestions as ConsultationQuestion[] : [],
    consentPreferences: record(value.consentPreferences) ? value.consentPreferences as unknown as ConsentPreferences : { localStorage: true, documentAnalysis: false, aiAssistant: false, voice: false, productAnalytics: false }
  };
}

export function serializePortableFamilyExport(data: PortableFamilyExport) {
  return JSON.stringify(data, null, 2);
}

export function downloadPortableFamilyExport(data: PortableFamilyExport) {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof Blob === 'undefined') return false;
  const blob = new Blob([serializePortableFamilyExport(data)], { type: 'application/json;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = `emi-datos-${data.exportedAt.slice(0, 10)}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(href), 0);
  return true;
}
