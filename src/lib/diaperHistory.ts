import { FamilyEvent } from '@/types/domain';

export type DiaperType = 'wet' | 'bowel' | 'both';
export type DiaperRecord = {
  id: string; type: DiaperType; title: string; detail: string; occurredAt: string;
  color?: string; consistency?: string; notes?: string; source: FamilyEvent['source'];
};

const textValue = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined;
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function diaperHistory(events: FamilyEvent[], profileId: string): DiaperRecord[] {
  return events.filter((event) => event.profileId === profileId && event.kind === 'diaper').map((event) => {
    const explicit = `${event.title} ${event.detail}`.toLocaleLowerCase('es-MX');
    const type: DiaperType = explicit.includes('ambos') || (explicit.includes('mojado') && explicit.includes('evacuación'))
      ? 'both' : explicit.includes('evacuación') ? 'bowel' : 'wet';
    return {
      id: event.id, type, title: event.title, detail: event.detail, occurredAt: event.occurredAt,
      color: textValue(event.data?.color), consistency: textValue(event.data?.consistency),
      notes: textValue(event.data?.notes), source: event.source
    };
  }).sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
}

export function diaperDaySummary(records: DiaperRecord[], day: Date) {
  const daily = records.filter((record) => dayKey(new Date(record.occurredAt)) === dayKey(day));
  return {
    records: daily.length,
    wet: daily.filter((record) => record.type === 'wet' || record.type === 'both').length,
    bowel: daily.filter((record) => record.type === 'bowel' || record.type === 'both').length,
    both: daily.filter((record) => record.type === 'both').length
  };
}

export function diaperWeek(records: DiaperRecord[], endDay: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(endDay); day.setHours(12, 0, 0, 0); day.setDate(day.getDate() - (6 - index));
    return { day, ...diaperDaySummary(records, day) };
  });
}

export function latestRegisteredBowel(records: DiaperRecord[]) {
  return records.find((record) => record.type === 'bowel' || record.type === 'both');
}
