import { supabase } from '@/lib/supabase';

export type ErasureScope = 'account' | 'family' | 'profile';
export type ErasureStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed';
export type DataErasureRequest = {
  requestId: string;
  scope: ErasureScope;
  status: ErasureStatus;
  requestedAt: string;
  executeAfter: string;
  cancelledAt?: string;
  failureCode?: string;
};

export const confirmationPhraseFor = (scope: ErasureScope) => scope === 'account'
  ? 'ELIMINAR MI CUENTA'
  : scope === 'family' ? 'ELIMINAR MI FAMILIA' : 'ELIMINAR PERFIL';

export const canCancelErasure = (request: Pick<DataErasureRequest, 'status'>) => request.status === 'pending';

const fromRow = (row: Record<string, unknown>): DataErasureRequest => ({
  requestId: String(row.request_id || ''),
  scope: row.scope as ErasureScope,
  status: row.status as ErasureStatus,
  requestedAt: String(row.requested_at || ''),
  executeAfter: String(row.execute_after || ''),
  cancelledAt: row.cancelled_at ? String(row.cancelled_at) : undefined,
  failureCode: row.failure_code ? String(row.failure_code) : undefined
});

export async function listDataErasureRequests(familyId: string): Promise<DataErasureRequest[]> {
  if (!supabase) throw new Error('backend_unavailable');
  const { data, error } = await supabase.rpc('list_my_data_erasure_requests', { target_family: familyId });
  if (error) throw error;
  return ((data || []) as Record<string, unknown>[]).map(fromRow);
}

export async function reauthenticateAndRequestAccountErasure(input: {
  familyId: string;
  email: string;
  password: string;
  confirmationPhrase: string;
}): Promise<DataErasureRequest> {
  if (!supabase) throw new Error('backend_unavailable');
  const authenticated = await supabase.auth.signInWithPassword({ email: input.email.trim().toLowerCase(), password: input.password });
  if (authenticated.error || !authenticated.data.user) throw new Error('reauthentication_failed');
  const { data, error } = await supabase.rpc('request_data_erasure', {
    target_family: input.familyId,
    target_scope: 'account',
    target_profile_client_id: null,
    confirmation_phrase: input.confirmationPhrase
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.request_id || !row?.scheduled_for) throw new Error('request_unavailable');
  return {
    requestId: row.request_id,
    scope: 'account',
    status: 'pending',
    requestedAt: new Date().toISOString(),
    executeAfter: row.scheduled_for
  };
}

export async function cancelDataErasureRequest(requestId: string): Promise<void> {
  if (!supabase) throw new Error('backend_unavailable');
  const { error } = await supabase.rpc('cancel_data_erasure_request', { target_request: requestId });
  if (error) throw error;
}
