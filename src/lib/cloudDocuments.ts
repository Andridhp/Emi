import { supabase } from '@/lib/supabase';
import type { DocumentField } from '@/types/domain';

const BUCKET = 'medical-documents';
export const DOCUMENT_ANALYSIS_POLICY_VERSION = '2026-07-29';
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
export const ALLOWED_DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'] as const;

export function normalizedDocumentMime(name: string, declared?: string | null) {
  const value = (declared || '').toLowerCase();
  if ((ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(value)) return value;
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.heif')) return 'image/heif';
  return undefined;
}

export async function uploadPrivateDocument(input: {
  profileId: string; clientId: string; name: string; mimeType: string; sizeBytes: number;
  category: string; occurredAt: string; bytes: ArrayBuffer;
}) {
  if (!supabase) throw new Error('backend unavailable');
  const { data, error } = await supabase.rpc('prepare_private_document_upload', {
    profile_client_id: input.profileId,
    document_client_id: input.clientId,
    target_file_name: input.name,
    target_mime_type: input.mimeType,
    target_size_bytes: input.sizeBytes,
    target_category: input.category,
    target_document_date: input.occurredAt.slice(0, 10)
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.document_id || !row?.object_path) throw new Error('upload unavailable');
  const uploaded = await supabase.storage.from(BUCKET).upload(row.object_path, input.bytes, { contentType: input.mimeType, upsert: false });
  if (uploaded.error) {
    await supabase.rpc('delete_private_document_record', { target_document: row.document_id });
    throw uploaded.error;
  }
  const finalized = await supabase.rpc('finalize_private_document_upload', { target_document: row.document_id });
  if (finalized.error) {
    await supabase.storage.from(BUCKET).remove([row.object_path]);
    await supabase.rpc('delete_private_document_record', { target_document: row.document_id });
    throw finalized.error;
  }
  return { cloudId: row.document_id as string, storagePath: row.object_path as string };
}

export async function privateDocumentUrl(storagePath: string, expiresInSeconds = 60) {
  if (!supabase) throw new Error('backend unavailable');
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) throw error || new Error('signed url unavailable');
  return data.signedUrl;
}

export async function deletePrivateDocument(cloudId: string, storagePath: string) {
  if (!supabase) throw new Error('backend unavailable');
  const removed = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (removed.error) throw removed.error;
  const record = await supabase.rpc('delete_private_document_record', { target_document: cloudId });
  if (record.error) throw record.error;
}

export async function grantDocumentAnalysisConsent(familyId: string, userId: string, policyVersion: string) {
  if (!supabase) throw new Error('backend unavailable');
  const { error } = await supabase.from('consents').upsert({ family_id: familyId, user_id: userId, purpose: 'document_analysis', policy_version: policyVersion, granted_at: new Date().toISOString(), revoked_at: null }, { onConflict: 'family_id,user_id,purpose,policy_version' });
  if (error) throw error;
}

export async function revokeDocumentAnalysisConsent(familyId: string, userId: string) {
  if (!supabase) throw new Error('backend unavailable');
  const { error } = await supabase.from('consents').update({ revoked_at: new Date().toISOString() })
    .eq('family_id', familyId).eq('user_id', userId).eq('purpose', 'document_analysis').is('revoked_at', null);
  if (error) throw error;
}

export async function requestPrivateDocumentProcessing(cloudId: string, policyVersion: string) {
  if (!supabase) throw new Error('backend unavailable');
  const { data, error } = await supabase.rpc('request_document_processing', { target_document: cloudId, consent_policy_version: policyVersion });
  if (error || !data) throw error || new Error('processing unavailable');
  return data as string;
}

export async function confirmPrivateDocumentFacts(cloudId: string, fields: DocumentField[]) {
  if (!supabase) throw new Error('backend unavailable');
  const confirmations = fields.map((field) => ({ id: field.id, value: field.value.trim(), selected: field.selected }));
  const { data, error } = await supabase.rpc('confirm_document_facts', { target_document: cloudId, confirmations });
  if (error) throw error;
  return Number(data || 0);
}
