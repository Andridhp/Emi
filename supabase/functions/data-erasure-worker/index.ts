import { createClient } from '@supabase/supabase-js';

const WORKER = 'emi-data-erasure-v1';
class WorkerFailure extends Error { constructor(readonly code: string) { super(code); } }
const required = (name: string) => { const value = Deno.env.get(name); if (!value) throw new WorkerFailure(`missing_${name.toLowerCase()}`); return value; };
const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
  if (request.headers.get('x-worker-secret') !== required('DELETION_WORKER_SECRET')) return new Response('Unauthorized', { status: 401 });
  const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
  const removeProfileObjects = async (bucket: string, familyId: string, profileId: string) => {
    const folder = `${familyId}/${profileId}`;
    const paths: string[] = [];
    for (let offset = 0; offset < 10_000; offset += 1000) {
      const listed = await supabase.storage.from(bucket).list(folder, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });
      if (listed.error) throw new WorkerFailure(`${bucket}_inventory_failed`);
      const names = (listed.data || []).filter((item) => item.id).map((item) => `${folder}/${item.name}`);
      paths.push(...names);
      if ((listed.data || []).length < 1000) break;
      if (offset === 9000) throw new WorkerFailure(`${bucket}_inventory_too_large`);
    }
    for (let index = 0; index < paths.length; index += 100) {
      const removed = await supabase.storage.from(bucket).remove(paths.slice(index, index + 100));
      if (removed.error) throw new WorkerFailure(`${bucket}_delete_failed`);
    }
  };

  const { data: queuedAuth, error: authClaimError } = await supabase.rpc('claim_auth_erasure', { target_worker: WORKER, lease_seconds: 180 });
  if (authClaimError) return Response.json({ status: 'failed', code: 'auth_claim_failed' }, { status: 500 });
  const authJob = queuedAuth?.[0];
  if (authJob) {
    const deleted = await supabase.auth.admin.deleteUser(authJob.user_id);
    if (deleted.error && (deleted.error as { status?: number }).status !== 404) {
      await supabase.rpc('fail_auth_erasure', { target_queue: authJob.queue_id, target_worker: WORKER, target_failure_code: 'auth_delete_failed' });
      return Response.json({ status: 'retry', stage: 'auth' }, { status: 503 });
    }
    await supabase.rpc('complete_auth_erasure', { target_queue: authJob.queue_id, target_worker: WORKER });
    return Response.json({ status: 'completed', stage: 'auth' });
  }

  let requestId: string | undefined;
  try {
    const { data: claimed, error: claimError } = await supabase.rpc('claim_due_data_erasure', { target_worker: WORKER, lease_seconds: 300 });
    if (claimError) throw new WorkerFailure('claim_failed');
    const job = claimed?.[0];
    if (!job) return Response.json({ status: 'idle' });
    requestId = job.request_id;

    let profileIds: string[] = [];
    if (job.scope === 'profile') profileIds = [job.profile_id];
    else {
      const profiles = await supabase.from('profiles').select('id').eq('family_id', job.family_id);
      if (profiles.error) throw new WorkerFailure('profiles_unavailable');
      profileIds = (profiles.data || []).map((profile) => profile.id);
    }
    if (profileIds.length) {
      for (const profileId of profileIds) {
        await removeProfileObjects('medical-documents', job.family_id, profileId);
        await removeProfileObjects('consultation-reports', job.family_id, profileId);
      }
    }
    const salt = required('ERASURE_RECEIPT_SECRET');
    const execution = await supabase.rpc('execute_claimed_data_erasure', {
      target_request: job.request_id,
      target_worker: WORKER,
      request_fingerprint: await sha256(`${salt}:request:${job.request_id}`),
      family_fingerprint: await sha256(`${salt}:family:${job.family_id}`),
      requester_fingerprint: await sha256(`${salt}:user:${job.requested_by}`)
    });
    if (execution.error) throw new WorkerFailure('database_delete_failed');
    const result = execution.data?.[0];
    // Account identities remain in the transient retry queue and are deleted on
    // the next invocation. This keeps database erasure and Auth deletion independently retryable.
    return Response.json({ status: 'completed', scope: result?.erased_scope || job.scope });
  } catch (error) {
    const code = error instanceof WorkerFailure ? error.code : 'worker_error';
    if (requestId) await supabase.rpc('fail_claimed_data_erasure', { target_request: requestId, target_worker: WORKER, target_failure_code: code });
    return Response.json({ status: 'failed', code }, { status: 500 });
  }
});
