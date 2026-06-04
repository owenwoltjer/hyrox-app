-- =============================================================================
-- HYROX Coach — Supabase Schema
-- Paste this entire file into the Supabase SQL Editor and click "Run".
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- for gen_random_uuid()

-- ---------------------------------------------------------------------------
-- session_logs
-- One row per training day. Upserted on day_key (ISO date string).
-- ---------------------------------------------------------------------------
create table if not exists public.session_logs (
  id          uuid        primary key default gen_random_uuid(),
  day_key     text        not null unique,         -- "YYYY-MM-DD"
  date        date        not null,
  dow         text        not null,                -- "Mon", "Tue", …
  session     text        not null,                -- session name from plan
  status      text        not null default 'planned'
                          check (status in ('completed', 'skipped', 'modified', 'planned')),
  rpe         smallint    check (rpe >= 1 and rpe <= 10),
  notes       text,
  paces       jsonb,                               -- { "1000m_avg": "4:12" }
  weights     jsonb,                               -- { "bench_press": "185lb" }
  updated_at  timestamptz not null default now()
);

-- Keep updated_at current on every upsert
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_session_logs_updated_at on public.session_logs;
create trigger trg_session_logs_updated_at
  before update on public.session_logs
  for each row execute function public.set_updated_at();

-- Indexes
create index if not exists idx_session_logs_date    on public.session_logs (date);
create index if not exists idx_session_logs_status  on public.session_logs (status);

-- ---------------------------------------------------------------------------
-- training_plan
-- One row per planned training day across all phases.
-- Seeded via scripts/seed-all-phases.ts (service role key required).
-- day_key is the conflict key: "Jun_4", "Jul_1", etc.
-- ---------------------------------------------------------------------------
create table if not exists public.training_plan (
  id         uuid     primary key default gen_random_uuid(),
  day_key    text     not null unique,   -- e.g. "Jun_4"
  phase      smallint not null,          -- 1 | 2 | 3 | 4
  week       smallint not null,          -- week within the phase
  dow        text     not null,          -- "Mon" | "Tue" | …
  date       text     not null,          -- "Jun 4" (no year)
  type       text     not null,          -- run | lift | combo | rest | bike | hyrox
  type_label text     not null,          -- human-readable label
  session    text     not null,          -- short session name
  desc       text     not null           -- full prescription
);

create index if not exists idx_training_plan_phase on public.training_plan (phase);
create index if not exists idx_training_plan_date  on public.training_plan (date);

alter table public.training_plan enable row level security;

drop policy if exists "anon_read_training_plan" on public.training_plan;
create policy "anon_read_training_plan"
  on public.training_plan
  for select
  to anon
  using (true);

-- ---------------------------------------------------------------------------
-- garmin_logs
-- One row per day of biometric data. Upserted on date.
-- ---------------------------------------------------------------------------
create table if not exists public.garmin_logs (
  id           uuid        primary key default gen_random_uuid(),
  date         date        not null unique,
  sleep_score  smallint    check (sleep_score >= 0 and sleep_score <= 100),
  avg_hr       smallint    check (avg_hr >= 30 and avg_hr <= 220),
  vo2_max      numeric(5,1) check (vo2_max >= 20 and vo2_max <= 90),
  created_at   timestamptz not null default now()
);

-- Index
create index if not exists idx_garmin_logs_date on public.garmin_logs (date);

-- ---------------------------------------------------------------------------
-- Row-Level Security (RLS)
-- Enable RLS and add a permissive policy for the anon key.
-- Tighten these policies once you add authentication.
-- ---------------------------------------------------------------------------
alter table public.session_logs enable row level security;
alter table public.garmin_logs  enable row level security;

-- Allow all operations for the anon role (single-user app, no auth yet)
drop policy if exists "anon_all_session_logs" on public.session_logs;
create policy "anon_all_session_logs"
  on public.session_logs
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "anon_all_garmin_logs" on public.garmin_logs;
create policy "anon_all_garmin_logs"
  on public.garmin_logs
  for all
  to anon
  using (true)
  with check (true);

-- =============================================================================
-- Done. Both tables are created with indexes, triggers, and RLS policies.
-- =============================================================================
