create extension if not exists "pgcrypto";

create type public.member_role as enum ('owner', 'caregiver', 'clinician_viewer');
create type public.data_source as enum ('parent', 'document', 'calculated', 'professional', 'ai');
create type public.guidance_level as enum ('expected', 'observe', 'consult', 'urgent');

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid references public.families(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role public.member_role not null,
  consented_at timestamptz,
  primary key (family_id, user_id)
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  kind text not null check (kind in ('pregnancy', 'child')),
  display_name text not null,
  birth_date date,
  due_date date,
  gestational_weeks smallint,
  created_at timestamptz not null default now()
);

create table public.pregnancies (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  last_menstrual_period date,
  due_date date,
  due_date_confirmed_by text,
  folic_acid_started_on date,
  folic_acid_dose text,
  history jsonb not null default '{}',
  complications jsonb not null default '[]'
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  occurred_at timestamptz not null,
  ended_at timestamptz,
  payload jsonb not null default '{}',
  source public.data_source not null,
  created_by uuid references auth.users(id),
  professional_name text,
  original_event_id uuid references public.events(id),
  created_at timestamptz not null default now()
);

create index events_profile_time_idx on public.events(profile_id, occurred_at desc);
create index events_payload_idx on public.events using gin(payload);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  sha256 text not null,
  category text,
  document_date date,
  extraction_status text not null default 'pending' check (extraction_status in ('pending','processing','review','confirmed','failed')),
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.extracted_facts (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  field_name text not null,
  raw_value text not null,
  normalized_value jsonb,
  confidence numeric check (confidence between 0 and 1),
  page_number integer,
  source public.data_source not null default 'document',
  confirmed_by uuid references auth.users(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  level public.guidance_level not null,
  source public.data_source not null default 'ai',
  evidence_event_ids uuid[] not null default '{}',
  ruleset_version text,
  expires_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  purpose text not null,
  policy_version text not null,
  granted_at timestamptz not null,
  revoked_at timestamptz
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  family_id uuid not null references public.families(id),
  actor_id uuid references auth.users(id),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  occurred_at timestamptz not null default now()
);

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.profiles enable row level security;
alter table public.pregnancies enable row level security;
alter table public.events enable row level security;
alter table public.documents enable row level security;
alter table public.extracted_facts enable row level security;
alter table public.insights enable row level security;
alter table public.consents enable row level security;

create or replace function public.is_family_member(target_family uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists(select 1 from public.family_members m where m.family_id = target_family and m.user_id = auth.uid());
$$;

create policy "members read families" on public.families for select using (public.is_family_member(id));
create policy "members read memberships" on public.family_members for select using (public.is_family_member(family_id));
create policy "members read profiles" on public.profiles for select using (public.is_family_member(family_id));
create policy "members manage profiles" on public.profiles for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));
create policy "members manage pregnancies" on public.pregnancies for all using (exists(select 1 from public.profiles p where p.id = profile_id and public.is_family_member(p.family_id))) with check (exists(select 1 from public.profiles p where p.id = profile_id and public.is_family_member(p.family_id)));
create policy "members manage events" on public.events for all using (exists(select 1 from public.profiles p where p.id = profile_id and public.is_family_member(p.family_id))) with check (exists(select 1 from public.profiles p where p.id = profile_id and public.is_family_member(p.family_id)));
create policy "members manage documents" on public.documents for all using (exists(select 1 from public.profiles p where p.id = profile_id and public.is_family_member(p.family_id))) with check (exists(select 1 from public.profiles p where p.id = profile_id and public.is_family_member(p.family_id)));
create policy "members manage facts" on public.extracted_facts for all using (exists(select 1 from public.documents d join public.profiles p on p.id = d.profile_id where d.id = document_id and public.is_family_member(p.family_id))) with check (exists(select 1 from public.documents d join public.profiles p on p.id = d.profile_id where d.id = document_id and public.is_family_member(p.family_id)));
create policy "members read insights" on public.insights for select using (exists(select 1 from public.profiles p where p.id = profile_id and public.is_family_member(p.family_id)));
create policy "users read own consent" on public.consents for select using (user_id = auth.uid());

-- Storage bucket should be private. Object keys: {family_id}/{profile_id}/{uuid}.
-- Create storage policies only after creating a private bucket named `medical-documents`.
