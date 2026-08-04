import { describe, expect, it } from 'vitest';
import { daysFromFolicAcidToLmp, pregnancyTimeline } from '../src/lib/prenatal';

describe('Cálculos prenatales documentales', () => {
  it('calcula FPP y edad gestacional desde la FUM', () => {
    const result = pregnancyTimeline({ lastMenstrualPeriod: '2026-02-01', now: new Date('2026-07-19T12:00:00') });
    expect(result.dueDate).toBe('2026-11-08');
    expect(result.weeks).toBe(24);
    expect(result.days).toBe(0);
    expect(result.trimester).toBe(2);
    expect(result.source).toBe('lastMenstrualPeriod');
  });

  it('prioriza la FPP registrada cuando existe', () => {
    const result = pregnancyTimeline({ lastMenstrualPeriod: '2026-02-10', dueDate: '2026-11-08', now: new Date('2026-07-19T12:00:00') });
    expect(result.weeks).toBe(24);
    expect(result.source).toBe('dueDate');
  });

  it('relaciona fechas de ácido fólico y FUM sin emitir valoración', () => {
    expect(daysFromFolicAcidToLmp('2026-01-12', '2026-02-01')).toBe(20);
  });

  it('no inventa una línea de tiempo cuando faltan fechas válidas', () => {
    expect(pregnancyTimeline({ lastMenstrualPeriod: 'fecha desconocida' })).toEqual({});
  });
});
