import { describe, expect, it } from 'vitest';
import { createPortableFamilyExport, serializePortableFamilyExport } from '../src/lib/dataExport';

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
    expect(data.schemaVersion).toBe('1.0');
    expect(data.exportedAt).toBe('2026-07-24T12:00:00.000Z');
  });

  it('excluye rutas privadas y archivos binarios del dispositivo', () => {
    const json = serializePortableFamilyExport(createPortableFamilyExport(input));
    expect(json).toContain('Informe.pdf');
    expect(json).not.toContain('file:///private');
    expect(json).not.toContain('secret.pdf');
  });
});
