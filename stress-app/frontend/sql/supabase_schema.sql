-- Re:Mind Supabase schema
-- Copy-paste this in the Supabase SQL editor.
-- The script is idempotent where practical: tables and indexes use IF NOT EXISTS,
-- policies are dropped and recreated, and the auth trigger is replaced safely.

create extension if not exists pgcrypto;

-- Shared timestamp helper.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'break_type') then
    create type public.break_type as enum ('walk', 'stretch', 'breathing');
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_plan') then
    create type public.user_plan as enum ('basic', 'premium', 'bedrijfslicentie');
  end if;
end;
$$;

-- Profiles are linked 1:1 to auth.users.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  first_name text,
  last_name text,
  email text,
  avatar_url text,
  plan user_plan not null default 'basic',
  work_start time,
  work_end time,
  break_frequency_mins integer check (break_frequency_mins > 0),
  fixed_breaks jsonb not null default '[]'::jsonb,
  break_reminders jsonb not null default '[]'::jsonb,
  pause_habit text,
  work_style text,
  work_type text,
  allow_reminders boolean not null default false,
  dark_mode boolean not null default false,
  use_company_colors boolean not null default true,
  calendar_linked boolean not null default false,
  company_management_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists plan public.user_plan not null default 'basic';
alter table public.profiles add column if not exists work_start time;
alter table public.profiles add column if not exists work_end time;
alter table public.profiles add column if not exists break_frequency_mins integer;
alter table public.profiles add column if not exists fixed_breaks jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists break_reminders jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists pause_habit text;
alter table public.profiles add column if not exists work_style text;
alter table public.profiles add column if not exists work_type text;
alter table public.profiles add column if not exists allow_reminders boolean not null default false;
alter table public.profiles add column if not exists dark_mode boolean not null default false;
alter table public.profiles add column if not exists use_company_colors boolean not null default true;
alter table public.profiles add column if not exists calendar_linked boolean not null default false;
alter table public.profiles add column if not exists company_management_enabled boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.work_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.work_sessions add column if not exists user_id uuid;
alter table public.work_sessions add column if not exists start_time timestamptz not null default now();
alter table public.work_sessions add column if not exists end_time timestamptz;
alter table public.work_sessions add column if not exists created_at timestamptz not null default now();
alter table public.work_sessions add column if not exists updated_at timestamptz not null default now();

create table if not exists public.stress_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.work_sessions (id) on delete cascade,
  stress_level smallint not null default 3 check (stress_level between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stress_checkins add column if not exists user_id uuid;
alter table public.stress_checkins add column if not exists session_id uuid;
alter table public.stress_checkins add column if not exists stress_level smallint;
alter table public.stress_checkins add column if not exists created_at timestamptz not null default now();
alter table public.stress_checkins add column if not exists updated_at timestamptz not null default now();

create table if not exists public.energy_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.work_sessions (id) on delete cascade,
  energy_level smallint not null default 2 check (energy_level between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.energy_checkins add column if not exists user_id uuid;
alter table public.energy_checkins add column if not exists session_id uuid;
alter table public.energy_checkins add column if not exists energy_level smallint;
alter table public.energy_checkins add column if not exists created_at timestamptz not null default now();
alter table public.energy_checkins add column if not exists updated_at timestamptz not null default now();

create table if not exists public.breaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.work_sessions (id) on delete cascade,
  type break_type not null,
  duration_minutes integer not null check (duration_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.breaks add column if not exists user_id uuid;
alter table public.breaks add column if not exists session_id uuid;
alter table public.breaks add column if not exists type public.break_type;
alter table public.breaks add column if not exists duration_minutes integer;
alter table public.breaks add column if not exists created_at timestamptz not null default now();
alter table public.breaks add column if not exists updated_at timestamptz not null default now();

create table if not exists public.break_reminder_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.work_sessions (id) on delete cascade,
  action text not null check (action in ('taken', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.break_reminder_events add column if not exists user_id uuid;
alter table public.break_reminder_events add column if not exists session_id uuid;
alter table public.break_reminder_events add column if not exists action text;
alter table public.break_reminder_events add column if not exists created_at timestamptz not null default now();
alter table public.break_reminder_events add column if not exists updated_at timestamptz not null default now();

create table if not exists public.favorite_pauses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pause_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, pause_id)
);

alter table public.favorite_pauses add column if not exists user_id uuid;
alter table public.favorite_pauses add column if not exists pause_id text;
alter table public.favorite_pauses add column if not exists created_at timestamptz not null default now();
alter table public.favorite_pauses add column if not exists updated_at timestamptz not null default now();

create table if not exists public.payment_details (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan user_plan not null,
  cardholder_name text,
  card_last4 text,
  card_expiry text,
  billing_email text,
  payment_status text not null default 'paid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_details_status_check check (payment_status in ('pending', 'paid', 'failed'))
);

alter table public.payment_details add column if not exists user_id uuid;
alter table public.payment_details add column if not exists plan public.user_plan;
alter table public.payment_details add column if not exists cardholder_name text;
alter table public.payment_details add column if not exists card_last4 text;
alter table public.payment_details add column if not exists card_expiry text;
alter table public.payment_details add column if not exists billing_email text;
alter table public.payment_details add column if not exists payment_status text not null default 'paid';
alter table public.payment_details add column if not exists created_at timestamptz not null default now();
alter table public.payment_details add column if not exists updated_at timestamptz not null default now();

create index if not exists profiles_full_name_idx
  on public.profiles (full_name);

create index if not exists profiles_email_idx
  on public.profiles (email);

create index if not exists profiles_plan_idx
  on public.profiles (plan);

create index if not exists work_sessions_user_id_start_time_idx
  on public.work_sessions (user_id, start_time desc);

create index if not exists stress_checkins_user_session_created_at_idx
  on public.stress_checkins (user_id, session_id, created_at desc);

create index if not exists energy_checkins_user_session_created_at_idx
  on public.energy_checkins (user_id, session_id, created_at desc);

create index if not exists breaks_user_session_created_at_idx
  on public.breaks (user_id, session_id, created_at desc);

create index if not exists break_reminder_events_user_session_created_at_idx
  on public.break_reminder_events (user_id, session_id, created_at desc);

create index if not exists favorite_pauses_user_pause_idx
  on public.favorite_pauses (user_id, pause_id);

create index if not exists payment_details_user_created_at_idx
  on public.payment_details (user_id, created_at desc);

alter table public.stress_checkins
  alter column session_id set not null;

alter table public.stress_checkins
  alter column stress_level set default 3;

alter table public.energy_checkins
  alter column session_id set not null;

alter table public.energy_checkins
  alter column energy_level set default 2;

alter table public.breaks
  alter column type type public.break_type
  using case
    when type::text in ('walk', 'stretch', 'breathing') then type::text::public.break_type
    else 'walk'::public.break_type
  end;

alter table public.breaks
  drop constraint if exists duration_positive;

alter table public.breaks
  drop constraint if exists breaks_duration_minutes_check;

alter table public.breaks
  add constraint duration_positive check (duration_minutes >= 0);

alter table public.favorite_pauses
  alter column pause_id set not null;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_work_sessions_updated_at on public.work_sessions;
create trigger set_work_sessions_updated_at
before update on public.work_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_stress_checkins_updated_at on public.stress_checkins;
create trigger set_stress_checkins_updated_at
before update on public.stress_checkins
for each row execute function public.set_updated_at();

drop trigger if exists set_energy_checkins_updated_at on public.energy_checkins;
create trigger set_energy_checkins_updated_at
before update on public.energy_checkins
for each row execute function public.set_updated_at();

drop trigger if exists set_breaks_updated_at on public.breaks;
create trigger set_breaks_updated_at
before update on public.breaks
for each row execute function public.set_updated_at();

drop trigger if exists set_break_reminder_events_updated_at on public.break_reminder_events;
create trigger set_break_reminder_events_updated_at
before update on public.break_reminder_events
for each row execute function public.set_updated_at();

drop trigger if exists set_favorite_pauses_updated_at on public.favorite_pauses;
create trigger set_favorite_pauses_updated_at
before update on public.favorite_pauses
for each row execute function public.set_updated_at();

drop trigger if exists set_payment_details_updated_at on public.payment_details;
create trigger set_payment_details_updated_at
before update on public.payment_details
for each row execute function public.set_updated_at();

create or replace function public.check_user_matches_session()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.work_sessions
    where id = new.session_id
      and user_id = new.user_id
  ) then
    raise exception 'User does not match session';
  end if;

  return new;
end;
$$;

drop trigger if exists check_user_session_stress on public.stress_checkins;
create trigger check_user_session_stress
before insert or update on public.stress_checkins
for each row execute function public.check_user_matches_session();

drop trigger if exists check_user_session_energy on public.energy_checkins;
create trigger check_user_session_energy
before insert or update on public.energy_checkins
for each row execute function public.check_user_matches_session();

drop trigger if exists check_user_session_breaks on public.breaks;
create trigger check_user_session_breaks
before insert or update on public.breaks
for each row execute function public.check_user_matches_session();

drop trigger if exists check_user_session_break_reminder_events on public.break_reminder_events;
create trigger check_user_session_break_reminder_events
before insert or update on public.break_reminder_events
for each row execute function public.check_user_matches_session();

create or replace function public.check_user_owns_favorite_pause()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is distinct from new.user_id then
    raise exception 'User does not match favorite pause owner';
  end if;

  return new;
end;
$$;

drop trigger if exists check_user_favorite_pause_owner on public.favorite_pauses;
create trigger check_user_favorite_pause_owner
before insert or update on public.favorite_pauses
for each row execute function public.check_user_owns_favorite_pause();

-- Automatically create a profile row when a Supabase auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    first_name,
    last_name,
    email,
    avatar_url,
    plan,
    onboarding_completed
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'first_name',
      new.email
    ),
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.email,
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce((new.raw_user_meta_data ->> 'plan')::public.user_plan, 'basic'::public.user_plan),
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.work_sessions enable row level security;
alter table public.stress_checkins enable row level security;
alter table public.energy_checkins enable row level security;
alter table public.breaks enable row level security;
alter table public.break_reminder_events enable row level security;
alter table public.favorite_pauses enable row level security;
alter table public.payment_details enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
on public.profiles
for delete
using (auth.uid() = id);

drop policy if exists "work_sessions_select_own" on public.work_sessions;
create policy "work_sessions_select_own"
on public.work_sessions
for select
using (auth.uid() = user_id);

drop policy if exists "work_sessions_insert_own" on public.work_sessions;
create policy "work_sessions_insert_own"
on public.work_sessions
for insert
with check (auth.uid() = user_id);

drop policy if exists "work_sessions_update_own" on public.work_sessions;
create policy "work_sessions_update_own"
on public.work_sessions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "work_sessions_delete_own" on public.work_sessions;
create policy "work_sessions_delete_own"
on public.work_sessions
for delete
using (auth.uid() = user_id);

drop policy if exists "stress_checkins_select_own" on public.stress_checkins;
create policy "stress_checkins_select_own"
on public.stress_checkins
for select
using (auth.uid() = user_id);

drop policy if exists "energy_checkins_select_own" on public.energy_checkins;
create policy "energy_checkins_select_own"
on public.energy_checkins
for select
using (auth.uid() = user_id);

drop policy if exists "energy_checkins_insert_own" on public.energy_checkins;
create policy "energy_checkins_insert_own"
on public.energy_checkins
for insert
with check (auth.uid() = user_id);

drop policy if exists "energy_checkins_update_own" on public.energy_checkins;
create policy "energy_checkins_update_own"
on public.energy_checkins
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "energy_checkins_delete_own" on public.energy_checkins;
create policy "energy_checkins_delete_own"
on public.energy_checkins
for delete
using (auth.uid() = user_id);

drop policy if exists "stress_checkins_insert_own" on public.stress_checkins;
create policy "stress_checkins_insert_own"
on public.stress_checkins
for insert
with check (auth.uid() = user_id);

drop policy if exists "stress_checkins_update_own" on public.stress_checkins;
create policy "stress_checkins_update_own"
on public.stress_checkins
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "stress_checkins_delete_own" on public.stress_checkins;
create policy "stress_checkins_delete_own"
on public.stress_checkins
for delete
using (auth.uid() = user_id);

drop policy if exists "breaks_select_own" on public.breaks;
create policy "breaks_select_own"
on public.breaks
for select
using (auth.uid() = user_id);

drop policy if exists "breaks_insert_own" on public.breaks;
create policy "breaks_insert_own"
on public.breaks
for insert
with check (auth.uid() = user_id);

drop policy if exists "breaks_update_own" on public.breaks;
create policy "breaks_update_own"
on public.breaks
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "breaks_delete_own" on public.breaks;
create policy "breaks_delete_own"
on public.breaks
for delete
using (auth.uid() = user_id);

drop policy if exists "break_reminder_events_select_own" on public.break_reminder_events;
create policy "break_reminder_events_select_own"
on public.break_reminder_events
for select
using (auth.uid() = user_id);

drop policy if exists "break_reminder_events_insert_own" on public.break_reminder_events;
create policy "break_reminder_events_insert_own"
on public.break_reminder_events
for insert
with check (auth.uid() = user_id);

drop policy if exists "break_reminder_events_update_own" on public.break_reminder_events;
create policy "break_reminder_events_update_own"
on public.break_reminder_events
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "break_reminder_events_delete_own" on public.break_reminder_events;
create policy "break_reminder_events_delete_own"
on public.break_reminder_events
for delete
using (auth.uid() = user_id);

drop policy if exists "favorite_pauses_select_own" on public.favorite_pauses;
create policy "favorite_pauses_select_own"
on public.favorite_pauses
for select
using (auth.uid() = user_id);

drop policy if exists "favorite_pauses_insert_own" on public.favorite_pauses;
create policy "favorite_pauses_insert_own"
on public.favorite_pauses
for insert
with check (auth.uid() = user_id);

drop policy if exists "favorite_pauses_update_own" on public.favorite_pauses;
create policy "favorite_pauses_update_own"
on public.favorite_pauses
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "favorite_pauses_delete_own" on public.favorite_pauses;
create policy "favorite_pauses_delete_own"
on public.favorite_pauses
for delete
using (auth.uid() = user_id);

drop policy if exists "payment_details_select_own" on public.payment_details;
create policy "payment_details_select_own"
on public.payment_details
for select
using (auth.uid() = user_id);

drop policy if exists "payment_details_insert_own" on public.payment_details;
create policy "payment_details_insert_own"
on public.payment_details
for insert
with check (auth.uid() = user_id);

drop policy if exists "payment_details_update_own" on public.payment_details;
create policy "payment_details_update_own"
on public.payment_details
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "payment_details_delete_own" on public.payment_details;
create policy "payment_details_delete_own"
on public.payment_details
for delete
using (auth.uid() = user_id);