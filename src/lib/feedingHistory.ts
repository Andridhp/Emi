import { FamilyEvent } from '@/types/domain';

export type FeedingType = 'breast' | 'bottle' | 'extraction' | 'solid' | 'other';
export type FeedingRecord = { id:string; type:FeedingType; title:string; detail:string; occurredAt:string; amount?:number; unit?:string; durationMinutes?:number; food?:string; reaction?:string; source:FamilyEvent['source'] };

const amount = (value: unknown) => { const parsed = Number(String(value ?? '').replace(',', '.')); return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined; };
export function feedingHistory(events: FamilyEvent[], profileId: string): FeedingRecord[] {
  return events.filter((event) => event.profileId === profileId && event.kind === 'feeding').map((event) => {
    const title = event.title.toLocaleLowerCase('es-MX');
    const type: FeedingType = title.includes('extracción') ? 'extraction' : title.includes('biberón') ? 'bottle' : title.includes('alimento') ? 'solid' : title.includes('lactancia') || title.includes('pecho') ? 'breast' : 'other';
    return { id:event.id,type,title:event.title,detail:event.detail,occurredAt:event.occurredAt,amount:amount(event.data?.amount),unit:typeof event.data?.unit === 'string' ? event.data.unit : undefined,durationMinutes:event.value && event.unit === 'min' ? event.value : undefined,food:typeof event.data?.food === 'string' ? event.data.food : undefined,reaction:typeof event.data?.reaction === 'string' ? event.data.reaction : undefined,source:event.source };
  }).sort((a,b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
}

export function feedingDaySummary(records: FeedingRecord[], day: Date) {
  const daily = records.filter((record) => new Date(record.occurredAt).toDateString() === day.toDateString());
  const totals = new Map<string, number>();
  daily.filter((record) => record.amount !== undefined && record.unit).forEach((record) => totals.set(record.unit!.toLowerCase(), (totals.get(record.unit!.toLowerCase()) ?? 0) + record.amount!));
  return { records:daily.length, breast:daily.filter((item) => item.type === 'breast').length, bottles:daily.filter((item) => item.type === 'bottle').length, extractions:daily.filter((item) => item.type === 'extraction').length, solids:daily.filter((item) => item.type === 'solid').length, totals:[...totals.entries()].map(([unit,value]) => ({ unit,value:Math.round(value*100)/100 })) };
}
