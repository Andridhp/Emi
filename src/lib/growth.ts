import { FamilyEvent, SourceKind } from '@/types/domain';

export type GrowthMetric = 'weight' | 'height';
export type GrowthPoint = { id: string; date: string; value: number; unit: 'kg' | 'cm'; original: string; source: SourceKind; measuredBy?: string };
const numeric = (value: unknown) => { const parsed = Number(String(value ?? '').replace(',', '.')); return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined; };

export function growthSeries(events: FamilyEvent[], profileId: string, metric: GrowthMetric): GrowthPoint[] {
  return events.filter((event) => event.profileId === profileId && event.kind === 'growth').flatMap((event) => {
    const title = event.title.toLocaleLowerCase('es-MX');
    if (metric === 'weight' ? !title.includes('peso') : !title.includes('talla')) return [];
    const value = numeric(event.data?.measurement ?? event.value); if (!value) return [];
    const rawUnit = String(event.data?.measurementUnit ?? event.unit ?? '').trim().toLowerCase();
    let normalized = value; let unit: GrowthPoint['unit'];
    if (metric === 'weight') { if (['lb', 'lbs', 'libra', 'libras'].includes(rawUnit)) normalized *= 0.45359237; else if (!['kg', 'kgs', 'kilogramo', 'kilogramos'].includes(rawUnit)) return []; unit = 'kg'; }
    else { if (['in', 'inch', 'pulgada', 'pulgadas'].includes(rawUnit)) normalized *= 2.54; else if (!['cm', 'centímetro', 'centímetros'].includes(rawUnit)) return []; unit = 'cm'; }
    return [{ id: event.id, date: event.occurredAt, value: Math.round(normalized * 100) / 100, unit, original: `${value} ${rawUnit}`, source: event.source, measuredBy: typeof event.data?.confirmedBy === 'string' ? event.data.confirmedBy : undefined }];
  }).sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

export function milestoneEvents(events: FamilyEvent[], profileId: string) { return events.filter((event) => event.profileId === profileId && event.kind === 'growth' && event.title.toLocaleLowerCase('es-MX').includes('hito')).sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt)); }
export function seriesChange(points: GrowthPoint[]) { if (points.length < 2) return undefined; return { delta: Math.round((points.at(-1)!.value - points[0].value) * 100) / 100, from: points[0].date, to: points.at(-1)!.date, count: points.length }; }
