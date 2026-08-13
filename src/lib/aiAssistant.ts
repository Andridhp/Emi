import { deriveAnalysisCards } from '@/lib/analysis';
import { supabase } from '@/lib/supabase';
import type { DocumentRecord, FamilyEvent, FamilyProfile } from '@/types/domain';

export const FAMILY_INSIGHTS_POLICY_VERSION = '2026-08-01';

export type AssistantPurpose = 'recent_summary' | 'consultation_questions' | 'document_changes';

export type AiObservation = {
  title: string;
  statement: string;
  evidenceIds: string[];
};

export type AiAssistantResult = {
  summary: string;
  observations: AiObservation[];
  missingData: string[];
  suggestedQuestions: string[];
  limitations: string[];
  generatedAt: string;
  model?: string;
  requestId?: string;
  demo: boolean;
  refused?: boolean;
};

const text = (value: unknown, limit: number) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const strings = (value: unknown, maxItems: number, maxLength: number) => Array.isArray(value)
  ? value.map((item) => text(item, maxLength)).filter(Boolean).slice(0, maxItems)
  : [];

export function validateAiAssistantResult(value: unknown, demo = false): AiAssistantResult {
  if (!value || typeof value !== 'object') throw new Error('invalid_assistant_response');
  const row = value as Record<string, unknown>;
  const summary = text(row.summary, 1200);
  if (!summary) throw new Error('invalid_assistant_response');
  const observations = Array.isArray(row.observations) ? row.observations.map((item) => {
    if (!item || typeof item !== 'object') return undefined;
    const observation = item as Record<string, unknown>;
    const title = text(observation.title, 140);
    const statement = text(observation.statement, 700);
    if (!title || !statement) return undefined;
    return { title, statement, evidenceIds: strings(observation.evidenceIds, 12, 80) };
  }).filter((item): item is AiObservation => Boolean(item)).slice(0, 8) : [];
  return {
    summary,
    observations,
    missingData: strings(row.missingData, 8, 300),
    suggestedQuestions: strings(row.suggestedQuestions, 8, 300),
    limitations: strings(row.limitations, 8, 300),
    generatedAt: text(row.generatedAt, 40) || new Date().toISOString(),
    model: text(row.model, 80) || undefined,
    requestId: text(row.requestId, 100) || undefined,
    demo,
    refused: row.refused === true
  };
}

export function createDemoAssistantResult(input: {
  profile: FamilyProfile;
  events: FamilyEvent[];
  documents: DocumentRecord[];
  purpose: AssistantPurpose;
  now?: Date;
}): AiAssistantResult {
  const now = input.now ?? new Date();
  const cards = deriveAnalysisCards({ profile: input.profile, events: input.events, documents: input.documents, now });
  const purposeIntro: Record<AssistantPurpose, string> = {
    recent_summary: `Vista local de los registros recientes de ${input.profile.name}.`,
    consultation_questions: `Preparación local para conversar sobre ${input.profile.name} con un profesional.`,
    document_changes: `Vista local de cambios entre datos documentales confirmados de ${input.profile.name}.`
  };
  const selected = input.purpose === 'document_changes' ? cards.filter((card) => card.source === 'document') : cards;
  const observations = selected.slice(0, 6).map((card) => ({
    title: card.title,
    statement: card.body,
    evidenceIds: [card.id]
  }));
  return {
    summary: `${purposeIntro[input.purpose]} Este análisis local usa cálculos deterministas en el dispositivo y no envía información a un proveedor externo.`,
    observations,
    missingData: cards.filter((card) => card.state === 'learning').slice(0, 4).map((card) => card.evidence),
    suggestedQuestions: selected.slice(0, 4).map((card) => `¿Conviene revisar con más detalle: ${card.title.toLowerCase()}?`),
    limitations: [
      'Esta vista no es una interpretación médica ni un diagnóstico.',
      'Un cambio temporal no demuestra una causa.',
      'La clasificación de atención se mantiene separada en Orientación segura.'
    ],
    generatedAt: now.toISOString(),
    model: 'motor-local-determinista',
    requestId: 'demo-local',
    demo: true
  };
}

export async function grantAiAssistantConsent(familyId: string, userId: string, policyVersion = FAMILY_INSIGHTS_POLICY_VERSION) {
  if (!supabase) throw new Error('backend unavailable');
  const { error } = await supabase.from('consents').upsert({
    family_id: familyId,
    user_id: userId,
    purpose: 'family_insights',
    policy_version: policyVersion,
    granted_at: new Date().toISOString(),
    revoked_at: null
  }, { onConflict: 'family_id,user_id,purpose,policy_version' });
  if (error) throw error;
}

export async function revokeAiAssistantConsent(familyId: string, userId: string) {
  if (!supabase) throw new Error('backend unavailable');
  const { error } = await supabase.from('consents').update({ revoked_at: new Date().toISOString() })
    .eq('family_id', familyId).eq('user_id', userId).eq('purpose', 'family_insights').is('revoked_at', null);
  if (error) throw error;
}

export async function requestAiAssistant(input: {
  familyId: string;
  profileClientId: string;
  purpose: AssistantPurpose;
}): Promise<AiAssistantResult> {
  if (!supabase) throw new Error('backend unavailable');
  const { data, error } = await supabase.functions.invoke('family-insights', { body: input });
  if (error) throw error;
  return validateAiAssistantResult(data, false);
}
