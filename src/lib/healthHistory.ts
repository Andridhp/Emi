import { FamilyEvent } from '@/types/domain';

export type TreatmentRecord = { id: string; type: 'medicine' | 'vaccine'; name: string; occurredAt: string; detail: string; dose?: string; route?: string; indicatedBy?: string; lot?: string; reaction?: string; source: FamilyEvent['source'] };

export function treatmentHistory(events: FamilyEvent[], profileId: string): TreatmentRecord[] {
  return events.filter((event) => event.profileId === profileId && event.kind === 'medicine').map((event) => {
    const vaccine = Boolean(event.data?.vaccine) || event.title.toLocaleLowerCase('es-MX').includes('vacuna');
    const type: TreatmentRecord['type'] = vaccine ? 'vaccine' : 'medicine';
    return { id: event.id, type, name: String(vaccine ? event.data?.vaccine || event.title : event.data?.medicine || event.title), occurredAt: event.occurredAt, detail: event.detail, dose: typeof event.data?.dose === 'string' ? event.data.dose : undefined, route: typeof event.data?.route === 'string' ? event.data.route : undefined, indicatedBy: typeof event.data?.indicatedBy === 'string' ? event.data.indicatedBy : undefined, lot: typeof event.data?.lot === 'string' ? event.data.lot : undefined, reaction: typeof event.data?.reaction === 'string' ? event.data.reaction : undefined, source: event.source };
  }).sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
}

export function treatmentCompleteness(record: TreatmentRecord) {
  if (record.type === 'vaccine') return { complete: Boolean(record.name && record.occurredAt), missing: [] as string[] };
  const missing = [!record.dose && 'dosis administrada', !record.route && 'vía'].filter(Boolean) as string[];
  return { complete: missing.length === 0, missing };
}
