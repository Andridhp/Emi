import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { BirthRecord, Caregiver, ConsultationQuestion, DocumentField, DocumentRecord, FamilyEvent, FamilyProfile, PostpartumRecord, PrenatalRecord } from '@/types/domain';

export type CloudWorkspace = {
  familyId?: string;
  familyName?: string;
  profiles: FamilyProfile[];
  events: FamilyEvent[];
  caregivers: Caregiver[];
  documents: DocumentRecord[];
  prenatalRecords: Record<string, PrenatalRecord>;
  birthRecords: Record<string, BirthRecord>;
  postpartumRecords: Record<string, PostpartumRecord>;
  consultationQuestions: ConsultationQuestion[];
  documentAnalysisConsent?: boolean;
  aiAssistantConsent?: boolean;
};

type ProfileRow = {
  id: string; client_id: string | null; kind: 'pregnancy' | 'child'; display_name: string;
  birth_date: string | null; due_date: string | null; gestational_weeks: number | null; created_at: string;
};

type EventRow = {
  id: string; client_id: string | null; profile_id: string; event_type: FamilyEvent['kind']; occurred_at: string;
  payload: Record<string, unknown>; source: FamilyEvent['source'];
};

type PregnancyRow = {
  profile_id: string; last_menstrual_period: string | null; due_date: string | null;
  due_date_confirmed_by: string | null; folic_acid_started_on: string | null;
  folic_acid_dose: string | null; history: Record<string, unknown> | null; complications: unknown;
};

type ContinuityRow = { profile_id: string; payload: Record<string, unknown> | null; updated_at: string };
type QuestionRow = { profile_id: string; client_id: string; question_text: string; created_at: string; resolved_at: string | null };

const profileFromRow = (row: ProfileRow): FamilyProfile => ({
  id: row.client_id || row.id,
  name: row.display_name,
  stage: row.kind,
  avatar: row.kind === 'pregnancy' ? '♡' : row.display_name.trim().charAt(0).toUpperCase(),
  createdAt: row.created_at,
  birthDate: row.birth_date || undefined,
  dueDate: row.due_date || undefined,
  gestationalWeeksAtBirth: row.gestational_weeks ?? undefined
});

const eventFromRow = (row: EventRow, profileClientIds: Map<string, string>): FamilyEvent => {
  const payload = row.payload || {};
  return {
    id: row.client_id || row.id,
    profileId: profileClientIds.get(row.profile_id) || row.profile_id,
    kind: row.event_type,
    title: String(payload.title || 'Registro'),
    detail: String(payload.detail || ''),
    occurredAt: row.occurred_at,
    source: row.source,
    value: typeof payload.value === 'number' ? payload.value : undefined,
    unit: typeof payload.unit === 'string' ? payload.unit : undefined,
    data: typeof payload.data === 'object' && payload.data ? payload.data as FamilyEvent['data'] : undefined
  };
};

export async function loadCloudWorkspace(user: User): Promise<CloudWorkspace> {
  const emptyWorkspace = { profiles: [], events: [], caregivers: [], documents: [], prenatalRecords: {}, birthRecords: {}, postpartumRecords: {}, consultationQuestions: [] };
  if (!supabase) return emptyWorkspace;
  const { data: membership, error: membershipError } = await supabase
    .from('family_members').select('family_id, families(name)').eq('user_id', user.id).limit(1).maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership?.family_id) return emptyWorkspace;

  const { data: profileRows, error: profileError } = await supabase
    .from('profiles').select('id, client_id, kind, display_name, birth_date, due_date, gestational_weeks, created_at')
    .eq('family_id', membership.family_id).order('created_at');
  if (profileError) throw profileError;
  const rows = (profileRows ?? []) as ProfileRow[];
  const serverToClient = new Map(rows.map((row) => [row.id, row.client_id || row.id]));
  const serverProfileIds = rows.map((row) => row.id);
  let eventRows: EventRow[] = [];
  let documentRows: any[] = [];
  let factRows: any[] = [];
  let pregnancyRows: PregnancyRow[] = [];
  let birthRows: ContinuityRow[] = [];
  let postpartumRows: ContinuityRow[] = [];
  let questionRows: QuestionRow[] = [];
  if (serverProfileIds.length) {
    const [eventsResult, documentsResult, pregnanciesResult, birthsResult, postpartumResult, questionsResult] = await Promise.all([
      supabase.from('events').select('id, client_id, profile_id, event_type, occurred_at, payload, source').in('profile_id', serverProfileIds).order('occurred_at', { ascending: false }),
      supabase.from('documents').select('id, client_id, profile_id, storage_path, file_name, mime_type, category, document_date, extraction_status, upload_status, size_bytes, created_at').in('profile_id', serverProfileIds).order('created_at', { ascending: false }),
      supabase.from('pregnancies').select('profile_id, last_menstrual_period, due_date, due_date_confirmed_by, folic_acid_started_on, folic_acid_dose, history, complications').in('profile_id', serverProfileIds),
      supabase.from('birth_records').select('profile_id, payload, updated_at').in('profile_id', serverProfileIds),
      supabase.from('postpartum_records').select('profile_id, payload, updated_at').in('profile_id', serverProfileIds),
      supabase.from('consultation_questions').select('profile_id, client_id, question_text, created_at, resolved_at').in('profile_id', serverProfileIds).order('created_at', { ascending: false })
    ]);
    const firstError = eventsResult.error || documentsResult.error || pregnanciesResult.error || birthsResult.error || postpartumResult.error || questionsResult.error;
    if (firstError) throw firstError;
    eventRows = (eventsResult.data ?? []) as EventRow[];
    documentRows = documentsResult.data ?? [];
    pregnancyRows = (pregnanciesResult.data ?? []) as PregnancyRow[];
    birthRows = (birthsResult.data ?? []) as ContinuityRow[];
    postpartumRows = (postpartumResult.data ?? []) as ContinuityRow[];
    questionRows = (questionsResult.data ?? []) as QuestionRow[];
    const documentIds = documentRows.map((row) => row.id);
    if (documentIds.length) {
      const factsResult = await supabase.from('extracted_facts').select('id, document_id, field_name, raw_value, normalized_value, confidence, page_number, confirmed_at').in('document_id', documentIds);
      if (factsResult.error) throw factsResult.error;
      factRows = factsResult.data ?? [];
    }
  }
  const [{ data: directoryRows, error: directoryError }, { data: accessRows, error: accessError }, { data: memberRows, error: memberError }] = await Promise.all([
    supabase.from('member_directory').select('user_id, display_name, relationship').eq('family_id', membership.family_id),
    supabase.from('member_profile_access').select('user_id, profile_id, access_level').eq('family_id', membership.family_id),
    supabase.from('family_members').select('user_id, role').eq('family_id', membership.family_id)
  ]);
  if (directoryError || accessError || memberError) throw directoryError || accessError || memberError;
  const accessByUser = new Map<string, Record<string, 'viewer' | 'editor' | 'manager'>>();
  for (const row of accessRows ?? []) {
    const profileClientId = serverToClient.get(row.profile_id);
    if (!profileClientId) continue;
    const current = accessByUser.get(row.user_id) ?? {};
    current[profileClientId] = row.access_level;
    accessByUser.set(row.user_id, current);
  }
  const roles = new Map((memberRows ?? []).map((row) => [row.user_id, row.role]));
  const caregivers: Caregiver[] = (directoryRows ?? []).map((row) => {
    const owner = roles.get(row.user_id) === 'owner';
    return { id: row.user_id, name: row.display_name, relationship: row.relationship, access: owner ? 'admin' : 'caregiver', profileAccess: owner ? Object.fromEntries(rows.map((profile) => [profile.client_id || profile.id, 'manager'])) : accessByUser.get(row.user_id) ?? {} };
  });
  const documents: DocumentRecord[] = documentRows.map((row) => {
    const fields: DocumentField[] = factRows.filter((fact) => fact.document_id === row.id).map((fact) => ({
      id: fact.id, label: fact.field_name,
      value: typeof fact.normalized_value?.value === 'string' ? fact.normalized_value.value : fact.raw_value,
      rawValue: fact.raw_value,
      confidence: fact.confidence >= .85 ? 'high' : fact.confidence >= .6 ? 'medium' : 'low',
      sourcePage: fact.page_number ?? undefined,
      selected: Boolean(fact.confirmed_at)
    }));
    const confirmed = fields.filter((field) => field.selected).map((field) => `${field.label}: ${field.value}`);
    const analysisStatus: DocumentRecord['analysisStatus'] = row.extraction_status === 'confirmed' ? 'confirmed' : row.extraction_status === 'review' ? 'ready' : row.extraction_status === 'processing' ? 'processing' : row.extraction_status === 'failed' ? 'failed' : 'idle';
    return {
      id: row.client_id || row.id, cloudId: row.id, profileId: serverToClient.get(row.profile_id) || row.profile_id,
      name: row.file_name, category: row.category || 'Pendiente de clasificar',
      date: row.document_date ? new Date(`${row.document_date}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin fecha',
      occurredAt: row.document_date ? `${row.document_date}T12:00:00.000Z` : row.created_at,
      status: analysisStatus === 'confirmed' ? 'reviewed' : 'pending', analysisStatus, extracted: confirmed,
      extractedFields: fields, storagePath: row.storage_path, mimeType: row.mime_type, sizeBytes: row.size_bytes ?? undefined,
      localOnly: false, uploadStatus: row.upload_status === 'uploaded' ? 'uploaded' : row.upload_status === 'failed' ? 'failed' : 'uploading'
    };
  });
  const family = membership.families as unknown as { name?: string } | null;
  const { data: consentRows, error: consentError } = await supabase.from('consents').select('purpose')
    .eq('family_id', membership.family_id).eq('user_id', user.id)
    .in('purpose', ['document_analysis', 'family_insights']).is('revoked_at', null);
  if (consentError) throw consentError;
  const prenatalRecords = Object.fromEntries(pregnancyRows.map((row) => {
    const profileId = serverToClient.get(row.profile_id) || row.profile_id;
    const history = row.history && typeof row.history === 'object' ? row.history : {};
    const complicationValue = typeof row.complications === 'string'
      ? row.complications
      : Array.isArray(row.complications) ? row.complications.map(String).join('; ') : undefined;
    const record: PrenatalRecord = {
      profileId,
      planningStarted: typeof history.planningStarted === 'string' ? history.planningStarted : undefined,
      lastMenstrualPeriod: row.last_menstrual_period || undefined,
      dueDate: row.due_date || undefined,
      dueDateConfirmedBy: row.due_date_confirmed_by || undefined,
      folicAcidStarted: row.folic_acid_started_on || undefined,
      folicAcidDose: row.folic_acid_dose || undefined,
      supplements: typeof history.supplements === 'string' ? history.supplements : undefined,
      medicalHistory: typeof history.medicalHistory === 'string' ? history.medicalHistory : undefined,
      previousPregnancies: typeof history.previousPregnancies === 'string' ? history.previousPregnancies : undefined,
      familyHistory: typeof history.familyHistory === 'string' ? history.familyHistory : undefined,
      complications: complicationValue,
      primaryProfessional: typeof history.primaryProfessional === 'string' ? history.primaryProfessional : undefined,
      updatedAt: typeof history.updatedAt === 'string' ? history.updatedAt : new Date().toISOString()
    };
    return [profileId, record];
  }));
  const birthRecords = Object.fromEntries(birthRows.map((row) => {
    const profileId = serverToClient.get(row.profile_id) || row.profile_id;
    return [profileId, { ...(row.payload ?? {}), profileId, updatedAt: typeof row.payload?.updatedAt === 'string' ? row.payload.updatedAt : row.updated_at } as BirthRecord];
  }));
  const postpartumRecords = Object.fromEntries(postpartumRows.map((row) => {
    const profileId = serverToClient.get(row.profile_id) || row.profile_id;
    return [profileId, { ...(row.payload ?? {}), profileId, updatedAt: typeof row.payload?.updatedAt === 'string' ? row.payload.updatedAt : row.updated_at } as PostpartumRecord];
  }));
  const consultationQuestions: ConsultationQuestion[] = questionRows.map((row) => ({
    id: row.client_id,
    profileId: serverToClient.get(row.profile_id) || row.profile_id,
    text: row.question_text,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at || undefined
  }));
  return {
    familyId: membership.family_id,
    familyName: family?.name,
    profiles: rows.map(profileFromRow),
    events: eventRows.map((row) => eventFromRow(row, serverToClient)),
    caregivers,
    documents,
    prenatalRecords,
    birthRecords,
    postpartumRecords,
    consultationQuestions,
    documentAnalysisConsent: Boolean(consentRows?.some((row) => row.purpose === 'document_analysis')),
    aiAssistantConsent: Boolean(consentRows?.some((row) => row.purpose === 'family_insights'))
  };
}

export async function saveCloudProfile(familyId: string, profile: FamilyProfile): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc('upsert_profile_for_current_user', {
    target_family: familyId,
    local_client_id: profile.id,
    profile_kind: profile.stage,
    profile_name: profile.name,
    profile_birth_date: profile.birthDate || null,
    profile_due_date: profile.dueDate || null,
    profile_gestational_weeks: profile.gestationalWeeksAtBirth ?? null
  });
  if (error) throw error;
}

export async function saveCloudEvent(event: FamilyEvent): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc('upsert_event_for_current_user', {
    profile_client_id: event.profileId,
    event_client_id: event.id,
    target_event_type: event.kind,
    target_occurred_at: event.occurredAt,
    target_source: event.source,
    target_payload: { title: event.title, detail: event.detail, value: event.value, unit: event.unit, data: event.data }
  });
  if (error) throw error;
}

async function saveContinuityRecord(functionName: 'upsert_prenatal_record_for_current_user' | 'upsert_birth_record_for_current_user' | 'upsert_postpartum_record_for_current_user', profileId: string, record: PrenatalRecord | BirthRecord | PostpartumRecord): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc(functionName, { profile_client_id: profileId, record_payload: record });
  if (error) throw error;
}

async function saveConsultationQuestion(question: ConsultationQuestion): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc('upsert_consultation_question_for_current_user', {
    profile_client_id: question.profileId,
    question_client_id: question.id,
    target_question_text: question.text,
    target_created_at: question.createdAt,
    target_resolved_at: question.resolvedAt || null
  });
  if (error) throw error;
}

export async function syncCloudWorkspace(
  familyId: string,
  profiles: FamilyProfile[],
  events: FamilyEvent[],
  deletedEventIds: string[] = [],
  prenatalRecords: Record<string, PrenatalRecord> = {},
  birthRecords: Record<string, BirthRecord> = {},
  postpartumRecords: Record<string, PostpartumRecord> = {},
  consultationQuestions: ConsultationQuestion[] = [],
  deletedQuestionIds: string[] = []
): Promise<void> {
  for (const profile of profiles) await saveCloudProfile(familyId, profile);
  for (const [profileId, record] of Object.entries(prenatalRecords)) await saveContinuityRecord('upsert_prenatal_record_for_current_user', profileId, record);
  for (const [profileId, record] of Object.entries(birthRecords)) await saveContinuityRecord('upsert_birth_record_for_current_user', profileId, record);
  for (const [profileId, record] of Object.entries(postpartumRecords)) await saveContinuityRecord('upsert_postpartum_record_for_current_user', profileId, record);
  for (const event of events.filter((item) => item.source === 'parent' || item.source === 'professional')) await saveCloudEvent(event);
  for (const question of consultationQuestions) await saveConsultationQuestion(question);
  for (const clientId of deletedEventIds) {
    const { error } = await supabase?.rpc('delete_event_for_current_user', { event_client_id: clientId }) ?? { error: null };
    if (error) throw error;
  }
  for (const clientId of deletedQuestionIds) {
    const { error } = await supabase?.rpc('delete_consultation_question_for_current_user', { question_client_id: clientId }) ?? { error: null };
    if (error) throw error;
  }
}
