import { BirthRecord, Caregiver, ConsentPreferences, DocumentRecord, FamilyEvent, FamilyProfile, PostpartumRecord, PrenatalRecord } from '@/types/domain';

export type PortableFamilyExport = {
  format: 'emilia-family-export';
  schemaVersion: '1.0';
  exportedAt: string;
  notice: string;
  profiles: FamilyProfile[];
  caregivers: Caregiver[];
  prenatalRecords: PrenatalRecord[];
  birthRecords: BirthRecord[];
  postpartumRecords: PostpartumRecord[];
  events: FamilyEvent[];
  documents: Array<Omit<DocumentRecord, 'uri'>>;
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
  consentPreferences: ConsentPreferences;
  exportedAt?: Date;
}): PortableFamilyExport {
  return {
    format: 'emilia-family-export',
    schemaVersion: '1.0',
    exportedAt: (input.exportedAt ?? new Date()).toISOString(),
    notice: 'Copia solicitada por la familia. No es un expediente médico ni contiene los archivos binarios originales.',
    profiles: input.profiles.map((profile) => ({ ...profile })),
    caregivers: input.caregivers.map((caregiver) => ({ ...caregiver, profileAccess: { ...(caregiver.profileAccess ?? {}) } })),
    prenatalRecords: Object.values(input.prenatalRecords).map((record) => ({ ...record })),
    birthRecords: Object.values(input.birthRecords ?? {}).map((record) => ({ ...record })),
    postpartumRecords: Object.values(input.postpartumRecords ?? {}).map((record) => ({ ...record })),
    events: input.events.map((event) => ({ ...event, data: event.data ? { ...event.data } : undefined })),
    documents: input.documents.map(({ uri: _privateDevicePath, ...metadata }) => ({ ...metadata })),
    consentPreferences: { ...input.consentPreferences }
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
