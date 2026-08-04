import { compareConfirmedDocumentFields } from '@/lib/documents';
import { predictNextSleep, sleepConfidenceLabel } from '@/lib/sleepEngine';
import { DocumentRecord, FamilyEvent, FamilyProfile, SourceKind } from '@/types/domain';

export type AnalysisCard = {
  id: string;
  title: string;
  body: string;
  evidence: string;
  source: Extract<SourceKind, 'calculated' | 'document'>;
  state: 'observation' | 'learning' | 'review';
  href: string;
};

export function deriveAnalysisCards(input: { profile: FamilyProfile; events: FamilyEvent[]; documents: DocumentRecord[]; now?: Date }): AnalysisCard[] {
  const now = input.now ?? new Date();
  const profileEvents = input.events.filter((event) => event.profileId === input.profile.id && new Date(event.occurredAt) <= now);
  const recentStart = new Date(now.getTime() - 14 * 86400000);
  const recent = profileEvents.filter((event) => new Date(event.occurredAt) >= recentStart);
  const activeDays = new Set(recent.map((event) => new Date(event.occurredAt).toDateString())).size;
  const cards: AnalysisCard[] = [];

  if (input.profile.stage === 'child') {
    const sleep = predictNextSleep({ events: input.events, profileId: input.profile.id, birthDate: input.profile.birthDate, now });
    cards.push({
      id: 'sleep-pattern', title: sleep.phase === 'learning' || sleep.phase === 'stale' ? 'El patrón de sueño sigue aprendiendo' : 'Rango personal de sueño',
      body: sleep.explanation[0], evidence: `${sleep.sampleSize} intervalos útiles · ${sleep.patternDays} días observados · ${sleepConfidenceLabel[sleep.confidence]}`,
      source: 'calculated', state: sleep.phase === 'learning' || sleep.phase === 'stale' ? 'learning' : 'observation', href: '/sleep'
    });
  }

  cards.push(recent.length ? {
    id: 'record-coverage', title: 'Cobertura de los registros recientes', body: `Hay ${recent.length} ${recent.length === 1 ? 'registro' : 'registros'} ${activeDays === 1 ? 'en 1 día' : `distribuidos en ${activeDays} días`} durante las últimas dos semanas.`,
    evidence: 'Periodo fijo de 14 días · no evalúa si la cantidad es adecuada', source: 'calculated', state: activeDays >= 3 ? 'observation' : 'learning', href: '/calendar'
  } : {
    id: 'record-coverage', title: 'Faltan datos recientes para comparar', body: 'No hay registros de este perfil durante las últimas dos semanas. Emi no completará el periodo con supuestos.',
    evidence: 'Periodo revisado: últimos 14 días', source: 'calculated', state: 'learning', href: '/today'
  });

  const comparisons = compareConfirmedDocumentFields(input.documents, input.profile.id);
  comparisons.slice(0, 3).forEach((comparison, index) => cards.push({
    id: `document-comparison-${index}`, title: comparison.fieldLabel, body: comparison.statement,
    evidence: `${comparison.previousDocument} → ${comparison.currentDocument} · ambos confirmados por la familia`, source: 'document', state: 'review', href: '/documents'
  }));
  if (!comparisons.length) {
    const confirmed = input.documents.filter((document) => document.profileId === input.profile.id && document.analysisStatus === 'confirmed').length;
    cards.push({ id: 'document-learning', title: 'Comparaciones documentales', body: confirmed < 2 ? 'Se necesitan al menos dos documentos confirmados con el mismo campo para mostrar un cambio temporal.' : 'No se encontraron campos numéricos equivalentes entre los documentos confirmados.', evidence: `${confirmed} documentos confirmados para este perfil`, source: 'document', state: 'learning', href: '/documents' });
  }
  return cards;
}
