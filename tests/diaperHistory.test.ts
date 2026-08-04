import { describe, expect, it } from 'vitest';
import { diaperDaySummary, diaperHistory, latestRegisteredBowel } from '../src/lib/diaperHistory';

const event = (id: string, title: string, detail: string, profileId = 'p', occurredAt = '2026-07-24T10:00:00') => ({ id, profileId, kind:'diaper' as const, title, detail, occurredAt, source:'parent' as const });
describe('Historial de pañales', () => {
  it('distingue mojado, evacuación y ambos desde el registro explícito', () => {
    const records = diaperHistory([event('1','Pañal','Mojado'),event('2','Evacuación','Evacuación'),event('3','Ambos','Mojado y evacuación')], 'p');
    expect(records.map((record) => record.type).sort()).toEqual(['both','bowel','wet']);
  });
  it('cuenta ambos en humedad y evacuación', () => {
    const records = diaperHistory([event('1','Pañal','Mojado'),event('2','Ambos','Mojado y evacuación')], 'p');
    expect(diaperDaySummary(records, new Date('2026-07-24T12:00:00'))).toEqual({ records:2, wet:2, bowel:1, both:1 });
  });
  it('aísla el perfil y devuelve la última evacuación registrada', () => {
    const records = diaperHistory([event('1','Evacuación','Evacuación','otro'),event('2','Ambos','Mojado y evacuación','p','2026-07-23T09:00:00')], 'p');
    expect(records).toHaveLength(1); expect(latestRegisteredBowel(records)?.id).toBe('2');
  });
});
