-- Recoverable, server-executed data erasure. No client may delete a family or
-- account directly. Storage objects are removed by the trusted worker first.

alter table public.deletion_requests add column if not exists execute_after timestamptz;
alter table public.deletion_requests add column if not exists cancelled_at timestamptz;
alter table public.deletion_requests add column if not exists worker_name text;
alter table public.deletion_requests add column if not exists lease_expires_at timestamptz;
alter table public.deletion_requests add column if not exists attempt_count smallint not null default 0;
alter table public.deletion_requests add column if not exists failure_code text;
update public.deletion_requests set execute_after = requested_at + interval '7 days' where execute_after is null;
alter table public.deletion_requests alter column execute_after set not null;
alter table public.deletion_requests drop constraint if exists deletion_requests_status_check;
alter table public.deletion_requests add constraint deletion_requests_status_check
  check (status in ('pending','processing','completed','cancelled','failed'));

create unique index if not exists one_active_erasure_per_requester
  on public.deletion_requests(family_id, requested_by, scope)
  where status in ('pending','processing');

create table public.erasure_receipts (
  id uuid primary key default gen_random_uuid(),
  request_fingerprint text not null unique,
  family_fingerprint text not null,
  requester_fingerprint text not null,
  scope text not null check (scope in ('account','family','profile')),
  outcome text not null default 'database_deleted' check (outcome in ('database_deleted','completed')),
  completed_at timestamptz not null default now()
);

create table public.auth_erasure_queue (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null unique references public.erasure_receipts(id) on delete cascade,
  user_id uuid not null,
  status text not null default 'pending' check (status in ('pending','processing','failed')),
  attempt_count smallint not null default 0,
  worker_name text,
  lease_expires_at timestamptz,
  failure_code text,
  created_at timestamptz not null default now()
);

alter table public.erasure_receipts enable row level security;
alter table public.auth_erasure_queue enable row level security;

-- Requests can only be created through the function below. The earlier direct
-- insert policy did not provide recent-authentication or phrase confirmation.
drop policy if exists "owners request deletion" on public.deletion_requests;

create or replace function public.request_data_erasure(
  target_family uuid,
  target_scope text,
  target_profile_client_id text,
  confirmation_phrase text
) returns table(request_id uuid, scheduled_for timestamptz)
language plpgsql security definer set search_path = public as $$
declare target_profile uuid; new_request uuid; execution_time timestamptz; issued_at bigint; expected_phrase text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not public.is_family_owner(target_family) then raise exception 'owner access required'; end if;
  issued_at := nullif(auth.jwt()->>'iat', '')::bigint;
  if issued_at is null or extract(epoch from now())::bigint - issued_at > 600 then raise exception 'recent authentication required'; end if;
  if target_scope not in ('account','family','profile') then raise exception 'invalid scope'; end if;
  expected_phrase := case target_scope when 'account' then 'ELIMINAR MI CUENTA' when 'family' then 'ELIMINAR MI FAMILIA' else 'ELIMINAR PERFIL' end;
  if confirmation_phrase <> expected_phrase then raise exception 'confirmation phrase does not match'; end if;
  if target_scope = 'profile' then
    select id into target_profile from public.profiles
    where family_id = target_family and client_id = target_profile_client_id limit 1;
    if target_profile is null then raise exception 'profile unavailable'; end if;
  elsif nullif(target_profile_client_id, '') is not null then
    raise exception 'profile must be empty';
  end if;
  execution_time := now() + interval '7 days';
  insert into public.deletion_requests(family_id, requested_by, scope, profile_id, execute_after)
  values (target_family, auth.uid(), target_scope, target_profile, execution_time)
  returning id into new_request;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_family, auth.uid(), 'data_erasure.requested', 'deletion_request', new_request);
  return query select new_request, execution_time;
end;
$$;

create or replace function public.list_my_data_erasure_requests(target_family uuid)
returns table(request_id uuid, scope text, status text, requested_at timestamptz, execute_after timestamptz, cancelled_at timestamptz, failure_code text)
language sql security definer set search_path = public stable as $$
  select r.id, r.scope, r.status, r.requested_at, r.execute_after, r.cancelled_at, r.failure_code
  from public.deletion_requests r
  where r.family_id = target_family and r.requested_by = auth.uid()
    and public.is_family_member(target_family)
  order by r.requested_at desc limit 20;
$$;

create or replace function public.cancel_data_erasure_request(target_request uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare target public.deletion_requests%rowtype;
begin
  select * into target from public.deletion_requests r
  where r.id = target_request and r.requested_by = auth.uid() and r.status = 'pending' for update;
  if target.id is null then raise exception 'request unavailable'; end if;
  update public.deletion_requests set status = 'cancelled', cancelled_at = now() where id = target.id;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target.family_id, auth.uid(), 'data_erasure.cancelled', 'deletion_request', target.id);
  return true;
end;
$$;

create or replace function public.claim_due_data_erasure(target_worker text, lease_seconds integer default 180)
returns table(request_id uuid, family_id uuid, profile_id uuid, requested_by uuid, scope text)
language plpgsql security definer set search_path = public as $$
declare target public.deletion_requests%rowtype;
begin
  if nullif(trim(target_worker), '') is null then raise exception 'worker required'; end if;
  update public.deletion_requests set status = 'failed', failure_code = 'lease_exhausted', lease_expires_at = null
  where status = 'processing' and lease_expires_at < now() and attempt_count >= 5;
  update public.deletion_requests set status = 'pending', worker_name = null, lease_expires_at = null,
    execute_after = now() + interval '1 hour'
  where status = 'processing' and lease_expires_at < now() and attempt_count < 5;
  select * into target from public.deletion_requests r
  where r.status = 'pending' and r.execute_after <= now()
  order by r.execute_after for update skip locked limit 1;
  if target.id is null then return; end if;
  update public.deletion_requests set status = 'processing', worker_name = trim(target_worker),
    attempt_count = attempt_count + 1, lease_expires_at = now() + make_interval(secs => greatest(60, least(lease_seconds, 600)))
  where id = target.id;
  return query select target.id, target.family_id, target.profile_id, target.requested_by, target.scope;
end;
$$;

create or replace function public.execute_claimed_data_erasure(
  target_request uuid,
  target_worker text,
  request_fingerprint text,
  family_fingerprint text,
  requester_fingerprint text
) returns table(receipt_id uuid, account_user_id uuid, erased_scope text)
language plpgsql security definer set search_path = public as $$
declare target public.deletion_requests%rowtype; receipt uuid;
begin
  if request_fingerprint !~ '^[a-f0-9]{64}$' or family_fingerprint !~ '^[a-f0-9]{64}$' or requester_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'invalid fingerprint'; end if;
  select * into target from public.deletion_requests r
  where r.id = target_request and r.status = 'processing' and r.worker_name = target_worker and r.lease_expires_at > now()
  for update;
  if target.id is null then raise exception 'worker lease unavailable'; end if;
  insert into public.erasure_receipts(request_fingerprint, family_fingerprint, requester_fingerprint, scope)
  values (request_fingerprint, family_fingerprint, requester_fingerprint, target.scope) returning id into receipt;
  if target.scope = 'profile' then
    delete from public.profiles where id = target.profile_id and family_id = target.family_id;
  else
    if target.scope = 'account' then
      insert into public.auth_erasure_queue(receipt_id, user_id) values (receipt, target.requested_by);
    end if;
    delete from public.audit_log where family_id = target.family_id;
    delete from public.families where id = target.family_id;
  end if;
  return query select receipt, case when target.scope = 'account' then target.requested_by else null end, target.scope;
end;
$$;

create or replace function public.fail_claimed_data_erasure(target_request uuid, target_worker text, target_failure_code text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.deletion_requests set
    status = case when attempt_count >= 5 then 'failed' else 'pending' end,
    execute_after = case when attempt_count >= 5 then execute_after else now() + interval '1 hour' end,
    failure_code = left(coalesce(target_failure_code, 'worker_error'), 80), worker_name = null, lease_expires_at = null
  where id = target_request and status = 'processing' and worker_name = target_worker;
  return found;
end;
$$;

create or replace function public.claim_auth_erasure(target_worker text, lease_seconds integer default 180)
returns table(queue_id uuid, receipt_id uuid, user_id uuid)
language plpgsql security definer set search_path = public as $$
declare target public.auth_erasure_queue%rowtype;
begin
  update public.auth_erasure_queue set status = 'failed', failure_code = 'lease_exhausted', lease_expires_at = null
  where status = 'processing' and lease_expires_at < now() and attempt_count >= 5;
  update public.auth_erasure_queue set status = 'pending', worker_name = null, lease_expires_at = null
  where status = 'processing' and lease_expires_at < now() and attempt_count < 5;
  select * into target from public.auth_erasure_queue q where q.status = 'pending'
  order by q.created_at for update skip locked limit 1;
  if target.id is null then return; end if;
  update public.auth_erasure_queue set status = 'processing', worker_name = trim(target_worker), attempt_count = attempt_count + 1,
    lease_expires_at = now() + make_interval(secs => greatest(60, least(lease_seconds, 600))) where id = target.id;
  return query select target.id, target.receipt_id, target.user_id;
end;
$$;

create or replace function public.complete_auth_erasure(target_queue uuid, target_worker text)
returns boolean language plpgsql security definer set search_path = public as $$
declare target_receipt uuid;
begin
  delete from public.auth_erasure_queue q where q.id = target_queue and q.status = 'processing' and q.worker_name = target_worker
  returning q.receipt_id into target_receipt;
  if target_receipt is null then raise exception 'queue unavailable'; end if;
  update public.erasure_receipts set outcome = 'completed', completed_at = now() where id = target_receipt;
  return true;
end;
$$;

create or replace function public.fail_auth_erasure(target_queue uuid, target_worker text, target_failure_code text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.auth_erasure_queue set status = case when attempt_count >= 5 then 'failed' else 'pending' end,
    failure_code = left(coalesce(target_failure_code, 'auth_delete_failed'), 80), worker_name = null, lease_expires_at = null
  where id = target_queue and status = 'processing' and worker_name = target_worker;
  return found;
end;
$$;

revoke all on function public.request_data_erasure(uuid,text,text,text) from public;
revoke all on function public.list_my_data_erasure_requests(uuid) from public;
revoke all on function public.cancel_data_erasure_request(uuid) from public;
revoke all on function public.claim_due_data_erasure(text,integer) from public;
revoke all on function public.execute_claimed_data_erasure(uuid,text,text,text,text) from public;
revoke all on function public.fail_claimed_data_erasure(uuid,text,text) from public;
revoke all on function public.claim_auth_erasure(text,integer) from public;
revoke all on function public.complete_auth_erasure(uuid,text) from public;
revoke all on function public.fail_auth_erasure(uuid,text,text) from public;
grant execute on function public.request_data_erasure(uuid,text,text,text) to authenticated;
grant execute on function public.list_my_data_erasure_requests(uuid) to authenticated;
grant execute on function public.cancel_data_erasure_request(uuid) to authenticated;
grant execute on function public.claim_due_data_erasure(text,integer) to service_role;
grant execute on function public.execute_claimed_data_erasure(uuid,text,text,text,text) to service_role;
grant execute on function public.fail_claimed_data_erasure(uuid,text,text) to service_role;
grant execute on function public.claim_auth_erasure(text,integer) to service_role;
grant execute on function public.complete_auth_erasure(uuid,text) to service_role;
grant execute on function public.fail_auth_erasure(uuid,text,text) to service_role;

comment on table public.erasure_receipts is 'Anonymous proof that erasure completed; contains hashes only and no family or user foreign keys.';
comment on table public.auth_erasure_queue is 'Server-only transient retry queue for deleting the Supabase Auth identity after application data is erased.';
