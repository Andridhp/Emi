import { FamilyEvent } from '@/types/domain';

export type SleepConfidence = 'none' | 'low' | 'medium' | 'high';
export type SleepPhase = 'learning' | 'upcoming' | 'within' | 'passed' | 'sleeping' | 'stale';

export interface SleepPrediction {
  phase: SleepPhase;
  confidence: SleepConfidence;
  confidenceScore: number;
  sampleSize: number;
  currentWakeMinutes?: number;
  targetWakeMinutes?: number;
  predictedAt?: string;
  rangeStart?: string;
  rangeEnd?: string;
  lastSleepEndedAt?: string;
  recentSleepMinutes: number;
  patternDays: number;
  excludedIntervals: number;
  likelyPeriod?: 'nap' | 'night';
  explanation: string[];
}

export interface SleepEngineInput {
  events: FamilyEvent[];
  profileId: string;
  birthDate?: string;
  now?: Date;
  sleepInProgress?: boolean;
}

export type CompletedSleep = { start: Date; end: Date; duration: number };

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60000);
const dateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

function removeIntervalOutliers(values: number[]) {
  if (values.length < 5) return { values, excluded: 0 };
  const center = median(values);
  const mad = median(values.map((value) => Math.abs(value - center)));
  const limit = Math.max(30, mad ? mad * 3 : center * .35);
  const filtered = values.filter((value) => Math.abs(value - center) <= limit);
  return { values: filtered.length >= 2 ? filtered : values, excluded: filtered.length >= 2 ? values.length - filtered.length : 0 };
}

const ageDays = (birthDate: string | undefined, now: Date) => {
  if (!birthDate) return undefined;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return undefined;
  return Math.max(0, Math.floor((now.getTime() - birth.getTime()) / 86400000));
};

export function completedSleeps(events: FamilyEvent[], profileId: string): CompletedSleep[] {
  return events
    .filter((event) => event.profileId === profileId && event.kind === 'sleep' && event.value && event.value > 0 && event.value <= 960)
    .map((event) => {
      const start = new Date(event.occurredAt);
      const duration = event.value as number;
      return { start, end: addMinutes(start, duration), duration };
    })
    .filter((sleep) => !Number.isNaN(sleep.start.getTime()))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function observedWakeIntervals(sleeps: CompletedSleep[]) {
  const intervals: number[] = [];
  for (let index = 1; index < sleeps.length; index += 1) {
    const minutes = Math.round((sleeps[index].start.getTime() - sleeps[index - 1].end.getTime()) / 60000);
    if (minutes >= 20 && minutes <= 480) intervals.push(minutes);
  }
  return intervals.slice(-10);
}

export function predictNextSleep({ events, profileId, birthDate, now = new Date(), sleepInProgress = false }: SleepEngineInput): SleepPrediction {
  if (sleepInProgress) return {
    phase: 'sleeping', confidence: 'none', confidenceScore: 0, sampleSize: 0,
    recentSleepMinutes: 0, patternDays: 0, excludedIntervals: 0,
    explanation: ['Hay un periodo de sueño en curso. La siguiente estimación se calculará cuando termine.']
  };

  const sleeps = completedSleeps(events, profileId).filter((sleep) => sleep.end <= now);
  const lastSleep = sleeps.at(-1);
  const rawIntervals = observedWakeIntervals(sleeps);
  const cleaned = removeIntervalOutliers(rawIntervals);
  const intervals = cleaned.values;
  const recentStart = new Date(now.getTime() - 24 * 3600000);
  const recentSleepMinutes = sleeps.filter((sleep) => sleep.end > recentStart).reduce((total, sleep) => total + sleep.duration, 0);
  const patternDays = new Set(sleeps.slice(-12).map((sleep) => dateKey(sleep.start))).size;
  if (!lastSleep || intervals.length < 2) return {
    phase: 'learning', confidence: 'none', confidenceScore: 0, sampleSize: intervals.length,
    recentSleepMinutes, patternDays, excludedIntervals: cleaned.excluded,
    lastSleepEndedAt: lastSleep?.end.toISOString(),
    explanation: [
      intervals.length === 0 ? 'Registra al menos tres periodos completos de sueño para encontrar un patrón personal.' : 'Hace falta un intervalo completo más para calcular un rango inicial.',
      'La app no completará datos faltantes con una supuesta rutina por edad.'
    ]
  };

  const lastEnded = lastSleep.end;
  const hoursSinceLastSleep = (now.getTime() - lastEnded.getTime()) / 3600000;
  if (hoursSinceLastSleep > 18) return {
    phase: 'stale', confidence: 'none', confidenceScore: 0, sampleSize: intervals.length,
    recentSleepMinutes, patternDays, excludedIntervals: cleaned.excluded,
    lastSleepEndedAt: lastEnded.toISOString(),
    explanation: ['El último periodo completo parece demasiado antiguo. Revisa si falta registrar sueño antes de usar una estimación.']
  };

  const target = Math.round(median(intervals));
  const deviations = intervals.map((value) => Math.abs(value - target));
  const mad = median(deviations);
  const variability = target ? mad / target : 1;
  let score = intervals.length >= 7 ? .78 : intervals.length >= 4 ? .6 : .36;
  if (patternDays >= 3) score += .06;
  else if (intervals.length >= 4) score -= .08;
  if (variability > .3) score -= .2;
  else if (variability < .12 && intervals.length >= 4) score += .08;
  const days = ageDays(birthDate, now);
  if (days !== undefined && days < 120) score = Math.min(score, .45);
  score = Math.max(.2, Math.min(.9, score));
  const confidence: SleepConfidence = score >= .72 ? 'high' : score >= .5 ? 'medium' : 'low';
  const halfRange = Math.round(Math.max(15, Math.min(45, mad ? mad * 1.5 : target * .18)));
  const predicted = addMinutes(lastEnded, target);
  const rangeStart = addMinutes(predicted, -halfRange);
  const rangeEnd = addMinutes(predicted, halfRange);
  const currentWakeMinutes = Math.max(0, Math.round((now.getTime() - lastEnded.getTime()) / 60000));
  const phase: SleepPhase = now < rangeStart ? 'upcoming' : now <= rangeEnd ? 'within' : 'passed';
  const predictedHour = predicted.getHours();
  const likelyPeriod = predictedHour >= 18 || predictedHour < 6 ? 'night' : 'nap';
  const explanation = [
    `Patrón calculado con ${intervals.length} intervalos útiles de ${patternDays} ${patternDays === 1 ? 'día' : 'días'}: centro de ${target} min.`,
    `Variación típica observada: ±${Math.round(mad)} min.`
  ];
  if (cleaned.excluded) explanation.push(`Se apartaron ${cleaned.excluded} ${cleaned.excluded === 1 ? 'intervalo muy distinto' : 'intervalos muy distintos'} para que un día atípico no domine el cálculo.`);
  if (patternDays < 3) explanation.push('Los registros todavía se concentran en pocos días; la confianza seguirá limitada hasta observar más días.');
  if (days !== undefined && days < 120) explanation.push('Por tener menos de cuatro meses, la confianza se mantiene baja aunque los registros sean consistentes.');
  if (phase === 'passed') explanation.push('El rango ya pasó; no intentes mantener al bebé despierto para seguir una estimación. Observa sus señales.');

  return {
    phase, confidence, confidenceScore: score, sampleSize: intervals.length,
    recentSleepMinutes, patternDays, excludedIntervals: cleaned.excluded, likelyPeriod,
    currentWakeMinutes, targetWakeMinutes: target,
    predictedAt: predicted.toISOString(), rangeStart: rangeStart.toISOString(), rangeEnd: rangeEnd.toISOString(),
    lastSleepEndedAt: lastEnded.toISOString(), explanation
  };
}

export const sleepConfidenceLabel: Record<SleepConfidence, string> = {
  none: 'Sin estimación', low: 'Confianza baja', medium: 'Confianza media', high: 'Confianza alta'
};
