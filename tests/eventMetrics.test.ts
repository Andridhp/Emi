import { describe, expect, it } from 'vitest';
import { getDailyMetrics } from '../src/lib/eventMetrics';
import { initialEvents } from '../src/data/demo';

describe('Métricas del panel diario', () => {
  it('calcula únicamente el perfil y día seleccionados', () => {
    const metrics = getDailyMetrics(initialEvents, 'emilia', new Date('2026-07-15T12:00:00'));
    expect(metrics).toEqual({ feedings: 2, diapers: 1, wetDiapers: 1, bowelMovements: 0, symptoms: 1, latestTemperature: 36.7, sleepMinutes: 117, sleepPeriods: 2 });
  });

  it('no mezcla perfiles ni días sin registros', () => {
    const metrics = getDailyMetrics(initialEvents, 'pregnancy', new Date('2026-07-15T12:00:00'));
    expect(metrics).toEqual({ feedings: 0, diapers: 0, wetDiapers: 0, bowelMovements: 0, symptoms: 0, latestTemperature: undefined, sleepMinutes: 0, sleepPeriods: 0 });
  });
});
