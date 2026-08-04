import { describe, expect, it } from 'vitest';
import { predictNextSleep } from '../src/lib/sleepEngine';
import { FamilyEvent } from '../src/types/domain';

const sleep = (id: string, start: string, minutes: number): FamilyEvent => ({
  id, profileId: 'baby', kind: 'sleep', title: 'Sueño', detail: `${minutes} min`, occurredAt: start,
  source: 'parent', value: minutes, unit: 'min'
});

const sleepsFromWakeIntervals = (intervals: number[]) => {
  const events: FamilyEvent[] = [];
  let start = new Date('2026-07-15T08:00:00');
  events.push(sleep('generated-0', start.toISOString(), 30));
  intervals.forEach((wake, index) => {
    start = new Date(start.getTime() + (30 + wake) * 60000);
    events.push(sleep(`generated-${index + 1}`, start.toISOString(), 30));
  });
  return events;
};

describe('Motor de sueño explicable', () => {
  it('permanece aprendiendo cuando faltan intervalos completos', () => {
    const result = predictNextSleep({ events: [sleep('1', '2026-07-15T08:00:00', 45)], profileId: 'baby', now: new Date('2026-07-15T10:00:00') });
    expect(result.phase).toBe('learning');
    expect(result.predictedAt).toBeUndefined();
  });

  it('usa la mediana personal y devuelve un rango, no una hora exacta', () => {
    const events = [
      sleep('1', '2026-07-15T08:00:00', 40),
      sleep('2', '2026-07-15T10:00:00', 45),
      sleep('3', '2026-07-15T12:10:00', 50),
      sleep('4', '2026-07-15T14:25:00', 40)
    ];
    const result = predictNextSleep({ events, profileId: 'baby', birthDate: '2026-01-01', now: new Date('2026-07-15T15:20:00') });
    expect(result.targetWakeMinutes).toBe(85);
    expect(result.rangeStart).toBeDefined();
    expect(result.rangeEnd).toBeDefined();
    expect(result.sampleSize).toBe(3);
  });

  it('limita la confianza antes de cuatro meses', () => {
    const events = [
      sleep('1', '2026-07-15T08:00:00', 30), sleep('2', '2026-07-15T09:30:00', 30),
      sleep('3', '2026-07-15T11:00:00', 30), sleep('4', '2026-07-15T12:30:00', 30),
      sleep('5', '2026-07-15T14:00:00', 30), sleep('6', '2026-07-15T15:30:00', 30),
      sleep('7', '2026-07-15T17:00:00', 30), sleep('8', '2026-07-15T18:30:00', 30)
    ];
    const result = predictNextSleep({ events, profileId: 'baby', birthDate: '2026-05-15', now: new Date('2026-07-15T19:10:00') });
    expect(result.confidence).toBe('low');
    expect(result.confidenceScore).toBeLessThanOrEqual(.45);
  });

  it('no predice mientras hay sueño activo', () => {
    const result = predictNextSleep({ events: [], profileId: 'baby', sleepInProgress: true });
    expect(result.phase).toBe('sleeping');
  });

  it('evita que un intervalo atípico domine el patrón personal', () => {
    const events = sleepsFromWakeIntervals([60, 62, 58, 300, 61, 59]);
    const result = predictNextSleep({ events, profileId: 'baby', birthDate: '2025-01-01', now: new Date(new Date(events.at(-1)!.occurredAt).getTime() + 31 * 60000) });
    expect(result.targetWakeMinutes).toBe(60);
    expect(result.excludedIntervals).toBe(1);
    expect(result.explanation.join(' ')).toContain('día atípico');
  });

  it('expone sueño reciente y días observados para explicar el cálculo', () => {
    const events = [sleep('a', '2026-07-14T09:00:00', 60), sleep('b', '2026-07-15T09:00:00', 45)];
    const result = predictNextSleep({ events, profileId: 'baby', now: new Date('2026-07-15T10:00:00') });
    expect(result.recentSleepMinutes).toBe(45);
    expect(result.patternDays).toBe(2);
  });
});
