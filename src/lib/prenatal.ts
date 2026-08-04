export interface PregnancyTimelineInput { lastMenstrualPeriod?: string; dueDate?: string; now?: Date }
export interface PregnancyTimeline { dueDate?: string; weeks?: number; days?: number; trimester?: 1 | 2 | 3; progress?: number; source?: 'dueDate' | 'lastMenstrualPeriod' }

const parseDate = (value?: string) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
};
const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function pregnancyTimeline({ lastMenstrualPeriod, dueDate, now = new Date() }: PregnancyTimelineInput): PregnancyTimeline {
  const lmp = parseDate(lastMenstrualPeriod);
  const suppliedDue = parseDate(dueDate);
  const calculatedDue = lmp ? new Date(lmp.getTime() + 280 * 86400000) : undefined;
  const due = suppliedDue ?? calculatedDue;
  if (!due) return {};
  const gestationDays = suppliedDue
    ? Math.round(280 - (due.getTime() - now.getTime()) / 86400000)
    : Math.round((now.getTime() - lmp!.getTime()) / 86400000);
  if (gestationDays < 0 || gestationDays > 308) return { dueDate: isoDate(due), source: suppliedDue ? 'dueDate' : 'lastMenstrualPeriod' };
  const weeks = Math.floor(gestationDays / 7);
  const days = gestationDays % 7;
  const trimester: 1 | 2 | 3 = gestationDays < 98 ? 1 : gestationDays < 196 ? 2 : 3;
  return { dueDate: isoDate(due), weeks, days, trimester, progress: Math.min(100, Math.max(0, Math.round(gestationDays / 280 * 100))), source: suppliedDue ? 'dueDate' : 'lastMenstrualPeriod' };
}

export function daysFromFolicAcidToLmp(folicAcidStarted?: string, lastMenstrualPeriod?: string) {
  const folic = parseDate(folicAcidStarted);
  const lmp = parseDate(lastMenstrualPeriod);
  if (!folic || !lmp) return undefined;
  return Math.round((lmp.getTime() - folic.getTime()) / 86400000);
}
