import { describe, expect, it } from 'vitest';
import { summarizePrenatalFollowup } from '../src/lib/prenatalSummary';
import { FamilyEvent } from '../src/types/domain';

const prenatal = (id: string, title: string, occurredAt: string, data: FamilyEvent['data'] = {}): FamilyEvent => ({ id, profileId: 'pregnancy', kind: 'prenatal', title, detail: title, occurredAt, source: 'parent', data });

describe('Panorama de seguimiento prenatal', () => {
  const events = [
    prenatal('g1', 'Ginecología', '2026-07-10T10:00:00', { bloodPressure: '110/70 mmHg', nextAppointment: '2026-08-10' }),
    prenatal('m1', 'Materno-fetal', '2026-07-08T10:00:00', { percentile: 'P48', nextAppointment: '2026-08-05' }),
    prenatal('l1', 'Laboratorio', '2026-07-02T10:00:00', { result: '12.1 g/dL' }),
    { ...prenatal('other', 'Ginecología', '2026-07-11T10:00:00'), profileId: 'otro' }
  ];

  it('separa perfiles y tipos de revisión', () => {
    const result = summarizePrenatalFollowup(events, 'pregnancy', new Date('2026-07-24T12:00:00'));
    expect(result.counts.gynecology).toBe(1);
    expect(result.counts.maternalFetal).toBe(1);
    expect(result.counts.laboratory).toBe(1);
  });

  it('ordena próximas revisiones y muestra datos sin interpretarlos', () => {
    const result = summarizePrenatalFollowup(events, 'pregnancy', new Date('2026-07-24T12:00:00'));
    expect(result.upcoming.map((item) => item.date)).toEqual(['2026-08-05', '2026-08-10']);
    expect(result.latest.find((item) => item.key === 'bloodPressure')?.value).toBe('110/70 mmHg');
    expect(result.latest.find((item) => item.key === 'percentile')?.value).toBe('P48');
  });
});
