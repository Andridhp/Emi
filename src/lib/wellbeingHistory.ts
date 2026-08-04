import { FamilyEvent } from '@/types/domain';

export type WellbeingType = 'temperature' | 'symptom' | 'mood';
export type WellbeingRecord = {
  id: string; type: WellbeingType; title: string; detail: string; occurredAt: string;
  temperature?: number; temperatureUnit?: string; method?: string; observation?: string;
  intensity?: string; frequency?: string; duration?: string; source: FamilyEvent['source'];
};

const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined;
const number = (value: unknown) => { const parsed = Number(String(value ?? '').replace(',', '.')); return Number.isFinite(parsed) ? parsed : undefined; };
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

export function wellbeingHistory(events: FamilyEvent[], profileId: string): WellbeingRecord[] {
  return events.filter((event) => event.profileId === profileId && (event.kind === 'symptom' || event.kind === 'temperature')).map((event) => {
    const title = event.title.toLocaleLowerCase('es-MX');
    const isTemperature = event.kind === 'temperature' || title.includes('temperatura') || event.data?.temperature !== undefined;
    const type: WellbeingType = isTemperature ? 'temperature' : title.includes('ánimo') ? 'mood' : 'symptom';
    const measured = number(event.data?.temperature ?? (isTemperature ? event.value : undefined));
    return {
      id:event.id,type,title:event.title,detail:event.detail,occurredAt:event.occurredAt,
      temperature:measured,temperatureUnit:text(event.data?.temperatureUnit) ?? (isTemperature ? event.unit : undefined),
      method:text(event.data?.method),observation:text(event.data?.symptom ?? event.data?.mood),
      intensity:text(event.data?.intensity),frequency:text(event.data?.frequency),duration:text(event.data?.duration),source:event.source
    };
  }).sort((a,b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
}

export function wellbeingDaySummary(records: WellbeingRecord[], day: Date) {
  const daily = records.filter((record) => dayKey(new Date(record.occurredAt)) === dayKey(day));
  return { records:daily.length, temperatures:daily.filter((item)=>item.type==='temperature').length, symptoms:daily.filter((item)=>item.type==='symptom').length, moods:daily.filter((item)=>item.type==='mood').length };
}

export function wellbeingWeek(records: WellbeingRecord[], endDay: Date) {
  return Array.from({length:7},(_,index)=>{ const day=new Date(endDay); day.setHours(12,0,0,0); day.setDate(day.getDate()-(6-index)); return {day,...wellbeingDaySummary(records,day)}; });
}

export function latestRegisteredTemperature(records: WellbeingRecord[]) {
  return records.find((record)=>record.type==='temperature' && record.temperature !== undefined);
}
