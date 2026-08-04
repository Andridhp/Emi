import { DocumentRecord, FamilyEvent } from '@/types/domain';
import type { ActiveSession } from '@/store/useAppStore';

export type OperationalNotice = {
  id: string;
  title: string;
  body: string;
  href: string;
  icon: 'timer-sand' | 'file-alert-outline' | 'calendar-heart' | 'chart-line';
  tone: 'peach' | 'amber' | 'mint';
  priority: 1 | 2;
};

export function deriveOperationalNotices(input: {
  profileId: string;
  events: FamilyEvent[];
  documents: DocumentRecord[];
  activeSessions: Partial<Record<'feeding' | 'sleep', ActiveSession>>;
  now?: Date;
}): OperationalNotice[] {
  const now = input.now ?? new Date();
  const notices: OperationalNotice[] = [];
  for (const session of Object.values(input.activeSessions).filter(Boolean) as ActiveSession[]) {
    const minutes = Math.max(0, Math.floor((now.getTime() - new Date(session.startedAt).getTime()) / 60000));
    notices.push({ id: `session-${session.kind}`, title: `${session.kind === 'sleep' ? 'Sueño' : 'Lactancia'} en curso`, body: `${session.label} · iniciado hace ${minutes} min`, href: `/track/${session.kind}`, icon: 'timer-sand', tone: 'peach', priority: 1 });
  }
  input.documents.filter((document) => document.profileId === input.profileId && (document.status === 'pending' || document.analysisStatus === 'ready')).forEach((document) => {
    notices.push({ id: `document-${document.id}`, title: 'Documento pendiente de revisar', body: `${document.name} · confirma los datos antes de usarlos`, href: `/document/${document.id}`, icon: 'file-alert-outline', tone: 'amber', priority: 1 });
  });
  const upcoming = input.events.filter((event) => event.profileId === input.profileId && event.kind === 'prenatal' && typeof event.data?.nextAppointment === 'string').flatMap((event) => {
    const date = new Date(String(event.data?.nextAppointment));
    const days = Math.ceil((date.getTime() - now.getTime()) / 86400000);
    return Number.isFinite(date.getTime()) && days >= 0 && days <= 14 ? [{ event, date, days }] : [];
  }).sort((a, b) => +a.date - +b.date)[0];
  if (upcoming) notices.push({ id: `appointment-${upcoming.event.id}`, title: upcoming.days === 0 ? 'Consulta registrada para hoy' : 'Consulta prenatal próxima', body: upcoming.date.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), href: '/calendar', icon: 'calendar-heart', tone: 'peach', priority: 1 });
  const recentCount = input.events.filter((event) => event.profileId === input.profileId && new Date(event.occurredAt) <= now && new Date(event.occurredAt) >= new Date(now.getTime() - 21 * 86400000)).length;
  if (recentCount >= 3) notices.push({ id: `summary-${input.profileId}`, title: 'Resumen reciente disponible', body: `${recentCount} registros para revisar sin asumir causalidad`, href: '/calendar', icon: 'chart-line', tone: 'mint', priority: 2 });
  return notices.sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title));
}
