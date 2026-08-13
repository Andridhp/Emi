import { describe, expect, it } from 'vitest';
import { createPortableFamilyExport, parsePortableFamilyExport, serializePortableFamilyExport } from '../src/lib/dataExport';

describe('Copia portable de datos', () => {
  const input = {
    profiles: [{ id: 'p', name: 'Emilia', stage: 'child' as const, avatar: 'E', createdAt: '2026-01-01' }],
    caregivers: [], prenatalRecords: {}, events: [],
    documents: [{ id: 'd', profileId: 'p', name: 'Informe.pdf', category: 'Pediatría', date: '2026-01-01', status: 'pending' as const, extracted: [], uri: 'file:///private/secret.pdf' }],
    consentPreferences: { localStorage: true, documentAnalysis: false, aiAssistant: false, voice: false, productAnalytics: false },
    exportedAt: new Date('2026-07-24T12:00:00Z')
  };

  it('incluye versión y fecha para futuras importaciones', () => {
    const data = createPortableFamilyExport(input);
    expect(data.format).toBe('emilia-family-export');
    expect(data.schemaVersion).toBe('1.1');
    expect(data.exportedAt).toBe('2026-07-24T12:00:00.000Z');
  });

  it('valida un respaldo antes de restaurarlo y acepta copias anteriores', () => {
    const current = createPortableFamilyExport(input);
    expect(parsePortableFamilyExport(serializePortableFamilyExport(current)).profiles).toHaveLength(input.profiles.length);
    const legacy = { ...current, schemaVersion: '1.0', consultationQuestions: undefined };
    expect(parsePortableFamilyExport(JSON.stringify(legacy)).consultationQuestions).toEqual([]);
    expect(() => parsePortableFamilyExport('{"format":"otro"}')).toThrow('respaldo compatible');
  });

  it('no exporta rutas ni identificadores privados de documentos', () => {
    const data = createPortableFamilyExport({ ...input, documents: [{ ...input.documents[0], uri: 'file:///private.pdf', cloudId: 'secret', storagePath: 'family/private.pdf', processingJobId: 'job' }] });
    const text = serializePortableFamilyExport(data);
    expect(text).not.toContain('file:///private.pdf');
    expect(text).not.toContain('family/private.pdf');
    expect(text).not.toContain('"cloudId"');
  });

  it('excluye rutas privadas y archivos binarios del dispositivo', () => {
    const json = serializePortableFamilyExport(createPortableFamilyExport(input));
    expect(json).toContain('Informe.pdf');
    expect(json).not.toContain('file:///private');
    expect(json).not.toContain('secret.pdf');
  });
});
