import { FamilyEvent } from '@/types/domain';

export interface PrenatalFollowupSummary {
  counts: { gynecology: number; maternalFetal: number; laboratory: number; measurements: number; symptoms: number };
  upcoming: { eventId: string; date: string; label: string }[];
  latest: { key: string; label: string; value: string; occurredAt: string }[];
}

const latestFields = [
  ['maternalWeight', 'Peso materno'], ['bloodPressure', 'Presión arterial'], ['glucose', 'Glucosa'],
  ['estimatedFetalWeight', 'Peso fetal estimado'], ['percentile', 'Percentil'], ['fetalHeartRate', 'Frecuencia cardiaca fetal']
] as const;

export function summarizePrenatalFollowup(events: FamilyEvent[], profileId: string, now = new Date()): PrenatalFollowupSummary {
  const prenatal = events.filter((event) => event.profileId === profileId && event.kind === 'prenatal').sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
  const count = (title: string) => prenatal.filter((event) => event.title === title).length;
  const upcoming = prenatal.flatMap((event) => {
    const value = event.data?.nextAppointment;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return [];
    const date = new Date(`${value}T12:00:00`);
    if (date < new Date(now.getFullYear(), now.getMonth(), now.getDate())) return [];
    return [{ eventId: event.id, date: value, label: event.title === 'Materno-fetal' ? 'Revisión materno-fetal' : 'Consulta de ginecología' }];
  }).sort((a, b) => a.date.localeCompare(b.date));
  const latest = latestFields.flatMap(([key, label]) => {
    const event = prenatal.find((item) => item.data?.[key] !== undefined && String(item.data[key]).trim());
    return event ? [{ key, label, value: String(event.data![key]), occurredAt: event.occurredAt }] : [];
  });
  return { counts: { gynecology: count('Ginecología'), maternalFetal: count('Materno-fetal'), laboratory: count('Laboratorio'), measurements: count('Medición materna'), symptoms: count('Síntoma') }, upcoming, latest };
}
