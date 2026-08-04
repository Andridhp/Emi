import { supabase } from '@/lib/supabase';
import type { ReportType } from '@/lib/report';

const BUCKET = 'consultation-reports';
export const MAX_REPORT_BYTES = 5 * 1024 * 1024;

export interface ProtectedReportShare {
  reportId: string;
  shareId: string;
  storagePath: string;
  url: string;
  expiresAt: string;
  fileName: string;
}

export interface ReportShareSummary {
  shareId: string;
  reportId: string;
  fileName: string;
  storagePath: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
  accessCount: number;
}

export const protectedReportShareUrl = (baseUrl: string, token: string) => `${baseUrl.replace(/\/$/, '')}/functions/v1/report-share#${encodeURIComponent(token)}`;

export async function uploadPrivateReport(input: {
  profileId: string;
  clientId: string;
  fileName: string;
  bytes: Uint8Array;
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
}) {
  if (!supabase) throw new Error('backend unavailable');
  if (!input.bytes.byteLength || input.bytes.byteLength > MAX_REPORT_BYTES) throw new Error('invalid report size');
  const { data, error } = await supabase.rpc('prepare_private_report_upload', {
    profile_client_id: input.profileId,
    report_client_id: input.clientId,
    target_file_name: input.fileName,
    target_size_bytes: input.bytes.byteLength,
    target_report_type: input.reportType,
    target_period_start: input.periodStart,
    target_period_end: input.periodEnd
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.report_id || !row?.object_path) throw new Error('report upload unavailable');
  const body = input.bytes.buffer.slice(input.bytes.byteOffset, input.bytes.byteOffset + input.bytes.byteLength) as ArrayBuffer;
  const uploaded = await supabase.storage.from(BUCKET).upload(row.object_path, body, { contentType: 'application/pdf', upsert: false });
  if (uploaded.error) {
    await supabase.rpc('delete_private_report_record', { target_report: row.report_id });
    throw uploaded.error;
  }
  const finalized = await supabase.rpc('finalize_private_report_upload', { target_report: row.report_id });
  if (finalized.error) {
    await supabase.storage.from(BUCKET).remove([row.object_path]);
    await supabase.rpc('delete_private_report_record', { target_report: row.report_id });
    throw finalized.error;
  }
  return { reportId: row.report_id as string, storagePath: row.object_path as string };
}

export async function createProtectedReportShare(reportId: string, fileName: string, storagePath: string, durationMinutes: number): Promise<ProtectedReportShare> {
  if (!supabase) throw new Error('backend unavailable');
  const { data, error } = await supabase.rpc('create_report_share_link', { target_report: reportId, duration_minutes: durationMinutes });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.share_id || !row?.raw_token || !row?.share_expires_at) throw new Error('share unavailable');
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  if (!base) throw new Error('backend unavailable');
  return {
    reportId, shareId: row.share_id, storagePath, fileName,
    expiresAt: row.share_expires_at,
    // The capability stays in the URL fragment, which browsers do not send in HTTP access logs.
    url: protectedReportShareUrl(base, row.raw_token)
  };
}

export async function revokeProtectedReportShare(shareId: string) {
  if (!supabase) throw new Error('backend unavailable');
  const { data, error } = await supabase.rpc('revoke_report_share_link', { target_share: shareId });
  if (error || !data) throw error || new Error('revoke unavailable');
}

export async function listProtectedReportShares(profileId: string): Promise<ReportShareSummary[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('list_report_shares_for_profile', { profile_client_id: profileId });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    shareId: row.share_id,
    reportId: row.report_id,
    fileName: row.file_name,
    storagePath: row.storage_path,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at || undefined,
    accessCount: Number(row.access_count || 0)
  }));
}

export async function deletePrivateReport(reportId: string, storagePath: string) {
  if (!supabase) throw new Error('backend unavailable');
  const removed = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (removed.error) throw removed.error;
  const { error } = await supabase.rpc('delete_private_report_record', { target_report: reportId });
  if (error) throw error;
}
