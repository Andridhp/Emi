import { FamilyEvent } from '@/types/domain';

export interface DailyMetrics {
  feedings: number;
  diapers: number;
  wetDiapers: number;
  bowelMovements: number;
  symptoms: number;
  latestTemperature?: number;
  sleepMinutes: number;
  sleepPeriods: number;
}

export function eventsForProfile(events: FamilyEvent[], profileId: string) {
  return events
    .filter((event) => event.profileId === profileId)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

export function getDailyMetrics(events: FamilyEvent[], profileId: string, date = new Date()): DailyMetrics {
  const day = date.toDateString();
  const daily = events.filter((event) => event.profileId === profileId && new Date(event.occurredAt).toDateString() === day);
  const diapers = daily.filter((event) => event.kind === 'diaper');
  const temperatures = daily.filter((event) => event.kind === 'temperature' || (event.kind === 'symptom' && event.title === 'Temperatura')).filter((event) => typeof event.value === 'number').sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
  return {
    feedings: daily.filter((event) => event.kind === 'feeding').length,
    diapers: diapers.length,
    wetDiapers: diapers.filter((event) => /mojado|ambos/i.test(`${event.title} ${event.detail}`)).length,
    bowelMovements: diapers.filter((event) => /evacuación|ambos/i.test(`${event.title} ${event.detail}`)).length,
    symptoms: daily.filter((event) => event.kind === 'symptom' || event.kind === 'temperature').length,
    latestTemperature: temperatures[0]?.value,
    sleepMinutes: daily.filter((event) => event.kind === 'sleep').reduce((sum, event) => sum + (event.value || 0), 0),
    sleepPeriods: daily.filter((event) => event.kind === 'sleep').length
  };
}
