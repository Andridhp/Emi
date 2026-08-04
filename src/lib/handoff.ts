import { FamilyEvent } from '@/types/domain';

export type HandoffPeriod = 6 | 12 | 24;

export interface CareHandoff {
  from: Date;
  to: Date;
  events: FamilyEvent[];
  hasRecords: boolean;
  feedings: number;
  sleepPeriods: number;
  sleepMinutes: number;
  diapers: number;
  wetDiapers: number;
  bowelMovements: number;
  wellbeing: number;
  treatments: number;
  comfort: number;
  latestTemperature?: { value: number; unit?: string; occurredAt: string };
}

export function createCareHandoff(events: FamilyEvent[], profileId: string, hours: HandoffPeriod, referenceDate = new Date()): CareHandoff {
  const to = new Date(referenceDate);
  const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
  const relevant = events
    .filter((event) => {
      const time = new Date(event.occurredAt).getTime();
      return event.profileId === profileId && time >= from.getTime() && time <= to.getTime();
    })
    .sort((a, b) => +new Date(a.occurredAt) - +new Date(b.occurredAt));
  const diapers = relevant.filter((event) => event.kind === 'diaper');
  const temperatures = relevant
    .filter((event) => (event.kind === 'temperature' || (event.kind === 'symptom' && /temperatura/i.test(event.title))) && typeof event.value === 'number')
    .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
  const latest = temperatures[0];

  return {
    from,
    to,
    events: relevant,
    hasRecords: relevant.length > 0,
    feedings: relevant.filter((event) => event.kind === 'feeding').length,
    sleepPeriods: relevant.filter((event) => event.kind === 'sleep').length,
    sleepMinutes: relevant.filter((event) => event.kind === 'sleep').reduce((sum, event) => sum + (event.value || 0), 0),
    diapers: diapers.length,
    wetDiapers: diapers.filter((event) => /mojado|ambos/i.test(`${event.title} ${event.detail}`)).length,
    bowelMovements: diapers.filter((event) => /evacuación|ambos/i.test(`${event.title} ${event.detail}`)).length,
    wellbeing: relevant.filter((event) => event.kind === 'symptom' || event.kind === 'temperature').length,
    treatments: relevant.filter((event) => event.kind === 'medicine').length,
    comfort: relevant.filter((event) => event.kind === 'comfort').length,
    latestTemperature: latest && latest.value !== undefined ? { value: latest.value, unit: latest.unit, occurredAt: latest.occurredAt } : undefined
  };
}
