-- Private consultation reports with expiring, revocable capability links.

create table public.consultation_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  client_id text not null,
  storage_path text not null default 'pending',
  file_name text not null,
  report_type text not null check (report_type in ('routine','illness')),
  period_start date not null,
  period_end date not null,
  size_bytes bigint not null check (size_bytes between 1 and 5242880),
  status text not null default 'pending' check (status in ('pending','uploaded','failed')),
  generated_by uuid not null references auth.users(id),
  generated_at timestamptz not null default now(),
  unique (profile_id, client_id)
);

create table public.report_share_links (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.consultation_reports(id) on delete cascade,
  token_hash bytea not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  access_count integer not null default 0,
  last_accessed_at timestamptz,
  check (expires_at > created_at)
);

create index consultation_reports_profile_generated_idx on public.consultation_reports(profile_id, generated_at desc);
create index report_share_links_report_idx on public.report_share_links(report_id, created_at desc);

alter table public.consultation_reports enable row level security;
alter table public.report_share_links enable row level security;

create policy "profile viewers read consultation reports" on public.consultation_reports for select
using (public.can_access_profile(profile_id, 'viewer'));
create policy "report authors or managers delete reports" on public.consultation_reports for delete
using (generated_by = auth.uid() or public.can_access_profile(profile_id, 'manager'));

create policy "share creators or managers read report links" on public.report_share_links for select
using (created_by = auth.uid() or exists(
  select 1 from public.consultation_reports r
  where r.id = report_id and public.can_access_profile(r.profile_id, 'manager')
));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('consultation-reports', 'consultation-reports', false, 5242880, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['application/pdf'];

create policy "profile viewers read private consultation reports" on storage.objects for select
using (
  bucket_id = 'consultation-reports'
  and public.can_access_profile((storage.foldername(name))[2]::uuid, 'viewer')
);
create policy "profile editors upload private consultation reports" on storage.objects for insert
with check (
  bucket_id = 'consultation-reports'
  and storage.extension(name) = 'pdf'
  and public.can_access_profile((storage.foldername(name))[2]::uuid, 'editor')
  and owner_id = auth.uid()::text
);
create policy "report owners or managers delete private consultation reports" on storage.objects for delete
using (
  bucket_id = 'consultation-reports'
  and (owner_id = auth.uid()::text or public.can_access_profile((storage.foldername(name))[2]::uuid, 'manager'))
);

create or replace function public.prepare_private_report_upload(
  profile_client_id text,
  report_client_id text,
  target_file_name text,
  target_size_bytes bigint,
  target_report_type text,
  target_period_start date,
  target_period_end date
) returns table(report_id uuid, object_path text)
language plpgsql security definer set search_path = public as $$
declare target_profile public.profiles%rowtype; new_report uuid; new_path text;
begin
  select * into target_profile from public.profiles p
  where p.client_id = profile_client_id and public.can_access_profile(p.id, 'editor') limit 1;
  if target_profile.id is null then raise exception 'profile unavailable'; end if;
  if nullif(trim(report_client_id), '') is null or target_report_type not in ('routine','illness') then raise exception 'invalid report'; end if;
  if target_size_bytes is null or target_size_bytes < 1 or target_size_bytes > 5242880 then raise exception 'invalid report size'; end if;
  if target_period_start is null or target_period_end is null or target_period_start > target_period_end then raise exception 'invalid report period'; end if;

  insert into public.consultation_reports(profile_id, client_id, file_name, report_type, period_start, period_end, size_bytes, generated_by)
  values (target_profile.id, left(report_client_id, 160), left(target_file_name, 220), target_report_type, target_period_start, target_period_end, target_size_bytes, auth.uid())
  on conflict (profile_id, client_id) do nothing
  returning id into new_report;
  if new_report is null then raise exception 'report identifier already in use'; end if;
  new_path := target_profile.family_id::text || '/' || target_profile.id::text || '/' || new_report::text || '.pdf';
  update public.consultation_reports set storage_path = new_path where id = new_report;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_profile.family_id, auth.uid(), 'consultation_report.upload_prepared', 'consultation_report', new_report);
  return query select new_report, new_path;
end;
$$;

create or replace function public.finalize_private_report_upload(target_report uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare target public.consultation_reports%rowtype; target_family uuid;
begin
  select * into target from public.consultation_reports r where r.id = target_report and r.generated_by = auth.uid() limit 1;
  if target.id is null then raise exception 'report unavailable'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id = 'consultation-reports' and o.name = target.storage_path) then raise exception 'object missing'; end if;
  update public.consultation_reports set status = 'uploaded' where id = target.id;
  select family_id into target_family from public.profiles where id = target.profile_id;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_family, auth.uid(), 'consultation_report.uploaded', 'consultation_report', target.id);
  return true;
end;
$$;

create or replace function public.create_report_share_link(target_report uuid, duration_minutes integer default 1440)
returns table(share_id uuid, raw_token text, share_expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare target public.consultation_reports%rowtype; target_family uuid; new_share uuid; token text; expiry timestamptz;
begin
  select * into target from public.consultation_reports r where r.id = target_report
    and r.status = 'uploaded'
    and (r.generated_by = auth.uid() or public.can_access_profile(r.profile_id, 'manager')) limit 1;
  if target.id is null then raise exception 'report unavailable'; end if;
  if duration_minutes < 15 or duration_minutes > 10080 then raise exception 'invalid share duration'; end if;
  token := encode(gen_random_bytes(32), 'hex');
  expiry := now() + make_interval(mins => duration_minutes);
  insert into public.report_share_links(report_id, token_hash, created_by, expires_at)
  values (target.id, digest(token, 'sha256'), auth.uid(), expiry) returning id into new_share;
  select family_id into target_family from public.profiles where id = target.profile_id;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_family, auth.uid(), 'consultation_report.share_created', 'report_share_link', new_share);
  return query select new_share, token, expiry;
end;
$$;

create or replace function public.consume_report_share_token(raw_token text)
returns table(report_id uuid, storage_path text, file_name text)
language plpgsql security definer set search_path = public as $$
declare target_link public.report_share_links%rowtype; target_report public.consultation_reports%rowtype; target_family uuid;
begin
  if raw_token is null or length(raw_token) <> 64 then return; end if;
  select * into target_link from public.report_share_links l
  where l.token_hash = digest(raw_token, 'sha256') and l.revoked_at is null and l.expires_at > now()
  limit 1 for update;
  if target_link.id is null then return; end if;
  select * into target_report from public.consultation_reports r where r.id = target_link.report_id and r.status = 'uploaded';
  if target_report.id is null then return; end if;
  update public.report_share_links set access_count = access_count + 1, last_accessed_at = now() where id = target_link.id;
  select family_id into target_family from public.profiles where id = target_report.profile_id;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_family, null, 'consultation_report.share_opened', 'report_share_link', target_link.id);
  return query select target_report.id, target_report.storage_path, target_report.file_name;
end;
$$;

create or replace function public.revoke_report_share_link(target_share uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare target_link public.report_share_links%rowtype; target_report public.consultation_reports%rowtype; target_family uuid;
begin
  select * into target_link from public.report_share_links where id = target_share limit 1;
  if target_link.id is null then return false; end if;
  select * into target_report from public.consultation_reports where id = target_link.report_id;
  if target_link.created_by <> auth.uid() and not public.can_access_profile(target_report.profile_id, 'manager') then raise exception 'share unavailable'; end if;
  update public.report_share_links set revoked_at = coalesce(revoked_at, now()) where id = target_link.id;
  select family_id into target_family from public.profiles where id = target_report.profile_id;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_family, auth.uid(), 'consultation_report.share_revoked', 'report_share_link', target_link.id);
  return true;
end;
$$;

create or replace function public.list_report_shares_for_profile(profile_client_id text)
returns table(
  share_id uuid, report_id uuid, file_name text, storage_path text, created_at timestamptz,
  expires_at timestamptz, revoked_at timestamptz, access_count integer
)
language sql security definer set search_path = public stable as $$
  select l.id, r.id, r.file_name, r.storage_path, l.created_at, l.expires_at, l.revoked_at, l.access_count
  from public.report_share_links l
  join public.consultation_reports r on r.id = l.report_id
  join public.profiles p on p.id = r.profile_id
  where p.client_id = profile_client_id
    and public.can_access_profile(p.id, 'viewer')
    and (l.created_by = auth.uid() or public.can_access_profile(p.id, 'manager'))
  order by l.created_at desc
  limit 25;
$$;

create or replace function public.delete_private_report_record(target_report uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare target public.consultation_reports%rowtype; target_family uuid;
begin
  select * into target from public.consultation_reports r where r.id = target_report
    and (r.generated_by = auth.uid() or public.can_access_profile(r.profile_id, 'manager')) limit 1;
  if target.id is null then raise exception 'report unavailable'; end if;
  select family_id into target_family from public.profiles where id = target.profile_id;
  delete from public.consultation_reports where id = target.id;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_family, auth.uid(), 'consultation_report.deleted', 'consultation_report', target.id);
  return true;
end;
$$;

revoke all on function public.prepare_private_report_upload(text,text,text,bigint,text,date,date) from public;
revoke all on function public.finalize_private_report_upload(uuid) from public;
revoke all on function public.create_report_share_link(uuid,integer) from public;
revoke all on function public.consume_report_share_token(text) from public;
revoke all on function public.revoke_report_share_link(uuid) from public;
revoke all on function public.list_report_shares_for_profile(text) from public;
revoke all on function public.delete_private_report_record(uuid) from public;
grant execute on function public.prepare_private_report_upload(text,text,text,bigint,text,date,date) to authenticated;
grant execute on function public.finalize_private_report_upload(uuid) to authenticated;
grant execute on function public.create_report_share_link(uuid,integer) to authenticated;
grant execute on function public.consume_report_share_token(text) to service_role;
grant execute on function public.revoke_report_share_link(uuid) to authenticated;
grant execute on function public.list_report_shares_for_profile(text) to authenticated;
grant execute on function public.delete_private_report_record(uuid) to authenticated;

comment on table public.consultation_reports is 'Private, family-selected PDF snapshots for clinical consultations; not medical records.';
comment on table public.report_share_links is 'Revocable capability links. Plain tokens are returned once and never stored.';
