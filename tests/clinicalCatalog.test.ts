import { describe, expect, it } from 'vitest';
import { ClinicalCatalog, selectClinicalCatalog } from '../src/lib/clinicalCatalog';

const catalog: ClinicalCatalog = {
  id: 'catalog-1', code: 'emergency-signs', version: '1.0', lifecycleStatus: 'published', countries: ['MX'], languages: ['es'],
  validFrom: '2026-01-01T00:00:00Z', validUntil: '2027-01-01T00:00:00Z',
  rules: [{ id: 'rule-1', stableCode: 'breathing-distress', stage: 'newborn', level: 'urgent', enabled: true, sourceUrl: 'https://www.who.int/' }]
};

describe('Selección del catálogo clínico', () => {
  it('acepta solamente un catálogo publicado, vigente y local', () => {
    expect(selectClinicalCatalog(catalog, 'mx', 'ES', new Date('2026-07-24')).available).toBe(true);
  });

  it('falla de forma cerrada para otra jurisdicción', () => {
    expect(selectClinicalCatalog(catalog, 'US', 'es', new Date('2026-07-24'))).toEqual({ available: false, reason: 'wrong_jurisdiction' });
  });

  it('descarta versiones suspendidas o vencidas', () => {
    expect(selectClinicalCatalog({ ...catalog, lifecycleStatus: 'suspended' }, 'MX', 'es', new Date('2026-07-24')).reason).toBe('not_published');
    expect(selectClinicalCatalog(catalog, 'MX', 'es', new Date('2027-01-01')).reason).toBe('expired');
  });
});
