-- Security hardening for multi-family production deployments.
-- Apply after 001_initial_schema.sql and test with distinct users/families.

create type public.profile_access_level as enum ('viewer', 'editor', 'manager');
create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');

create table public.member_profile_access (
  family_id uuid not null,
  user_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  access_level public.profile_access_level not null default 'viewer',
  granted_by uuid not null references auth.users(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, profile_id),
  foreign key (family_id, user_id) references public.family_members(family_id, user_id) on delete cascade
);

create table public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  invited_email_hash text not null,
  role public.member_role not null default 'caregiver',
  token_hash text not null unique,
  expires_at timestamptz not null,
  status public.invitation_status not null default 'pending',
  invited_by uuid not null references auth.users(id),
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  scope text not null check (scope in ('account', 'family', 'profile')),
  profile_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.member_profile_access enable row level security;
alter table public.family_invitations enable row level security;
alter table public.deletion_requests enable row level security;
alter table public.audit_log enable row level security;

create or replace function public.is_family_owner(target_family uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists(
    select 1 from public.family_members m
    where m.family_id = target_family and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

create or replace function public.can_access_profile(target_profile uuid, required_level public.profile_access_level default 'viewer')
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = target_profile and (
      public.is_family_owner(p.family_id)
      or exists (
        select 1 from public.member_profile_access a
        where a.profile_id = p.id and a.user_id = auth.uid()
          and case required_level
            when 'viewer' then a.access_level in ('viewer','editor','manager')
            when 'editor' then a.access_level in ('editor','manager')
            when 'manager' then a.access_level = 'manager'
          end
      )
    )
  );
$$;

create or replace function public.add_family_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.family_members(family_id, user_id, role, consented_at)
  values (new.id, new.created_by, 'owner', now());
  return new;
end;
$$;

create trigger family_owner_after_insert
after insert on public.families for each row execute function public.add_family_owner();

create policy "users create own family" on public.families for insert
with check (created_by = auth.uid());

drop policy if exists "members manage profiles" on public.profiles;
drop policy if exists "members read profiles" on public.profiles;
drop policy if exists "members read memberships" on public.family_members;
drop policy if exists "members manage pregnancies" on public.pregnancies;
drop policy if exists "members manage events" on public.events;
drop policy if exists "members manage documents" on public.documents;
drop policy if exists "members manage facts" on public.extracted_facts;
drop policy if exists "members read insights" on public.insights;

create policy "users read own membership" on public.family_members for select
using (user_id = auth.uid() or public.is_family_owner(family_id));
create policy "owners manage memberships" on public.family_members for all
using (public.is_family_owner(family_id)) with check (public.is_family_owner(family_id));

create policy "profile viewers read profiles" on public.profiles for select
using (public.can_access_profile(id, 'viewer'));
create policy "owners create profiles" on public.profiles for insert
with check (public.is_family_owner(family_id));
create policy "profile managers update profiles" on public.profiles for update
using (public.can_access_profile(id, 'manager')) with check (public.can_access_profile(id, 'manager'));
create policy "owners delete profiles" on public.profiles for delete
using (public.is_family_owner(family_id));

create policy "profile viewers read pregnancies" on public.pregnancies for select
using (public.can_access_profile(profile_id, 'viewer'));
create policy "profile editors create pregnancies" on public.pregnancies for insert
with check (public.can_access_profile(profile_id, 'editor'));
create policy "profile editors update pregnancies" on public.pregnancies for update
using (public.can_access_profile(profile_id, 'editor')) with check (public.can_access_profile(profile_id, 'editor'));

create policy "profile viewers read events" on public.events for select
using (public.can_access_profile(profile_id, 'viewer'));
create policy "profile editors create events" on public.events for insert
with check (public.can_access_profile(profile_id, 'editor') and created_by = auth.uid());
create policy "authors or managers update events" on public.events for update
using (created_by = auth.uid() or public.can_access_profile(profile_id, 'manager'))
with check (public.can_access_profile(profile_id, 'editor'));
create policy "authors or managers delete events" on public.events for delete
using (created_by = auth.uid() or public.can_access_profile(profile_id, 'manager'));

create policy "profile viewers read documents" on public.documents for select
using (public.can_access_profile(profile_id, 'viewer'));
create policy "profile editors upload documents" on public.documents for insert
with check (public.can_access_profile(profile_id, 'editor') and uploaded_by = auth.uid());
create policy "uploaders or managers update documents" on public.documents for update
using (uploaded_by = auth.uid() or public.can_access_profile(profile_id, 'manager'))
with check (public.can_access_profile(profile_id, 'editor'));
create policy "uploaders or managers delete documents" on public.documents for delete
using (uploaded_by = auth.uid() or public.can_access_profile(profile_id, 'manager'));

create policy "profile viewers read extracted facts" on public.extracted_facts for select
using (exists(select 1 from public.documents d where d.id = document_id and public.can_access_profile(d.profile_id, 'viewer')));
create policy "profile editors confirm extracted facts" on public.extracted_facts for update
using (exists(select 1 from public.documents d where d.id = document_id and public.can_access_profile(d.profile_id, 'editor')))
with check (exists(select 1 from public.documents d where d.id = document_id and public.can_access_profile(d.profile_id, 'editor')));

create policy "profile viewers read insights" on public.insights for select
using (public.can_access_profile(profile_id, 'viewer'));

create policy "owners manage profile access" on public.member_profile_access for all
using (public.is_family_owner(family_id)) with check (public.is_family_owner(family_id));
create policy "users read own profile access" on public.member_profile_access for select
using (user_id = auth.uid());

create policy "owners read audit log" on public.audit_log for select
using (public.is_family_owner(family_id));
create policy "users grant own consent" on public.consents for insert
with check (user_id = auth.uid() and public.is_family_member(family_id));
create policy "users revoke own consent" on public.consents for update
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owners request deletion" on public.deletion_requests for insert
with check (requested_by = auth.uid() and public.is_family_owner(family_id));
create policy "requesters read deletion status" on public.deletion_requests for select
using (requested_by = auth.uid());

-- Invitations are created, accepted and revoked only through server functions
-- using a service role. Plain clients intentionally receive no table policy.

-- Storage: create the private bucket before applying these policies.
insert into storage.buckets (id, name, public)
values ('medical-documents', 'medical-documents', false)
on conflict (id) do update set public = false;

create policy "profile viewers read private documents" on storage.objects for select
using (
  bucket_id = 'medical-documents'
  and public.can_access_profile((storage.foldername(name))[2]::uuid, 'viewer')
);
create policy "profile editors upload private documents" on storage.objects for insert
with check (
  bucket_id = 'medical-documents'
  and public.can_access_profile((storage.foldername(name))[2]::uuid, 'editor')
  and owner_id = auth.uid()::text
);
create policy "uploaders or managers delete private documents" on storage.objects for delete
using (
  bucket_id = 'medical-documents'
  and (owner_id = auth.uid()::text or public.can_access_profile((storage.foldername(name))[2]::uuid, 'manager'))
);

comment on table public.family_invitations is 'Server-only invitation tokens; store only hashes, never plaintext tokens or emails.';
comment on table public.audit_log is 'Append-only application audit trail. Inserts should be performed by trusted server functions.';
