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
                          check (status in ('done', 'skipped', 'modified', 'planned')),
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

-- ---------------------------------------------------------------------------
-- Migrations — run once in Supabase SQL Editor if the table already exists
-- ---------------------------------------------------------------------------

-- Add unique constraint on garmin_logs.date so upsert ON CONFLICT works.
-- Safe to run even if the constraint already exists.
ALTER TABLE public.garmin_logs
  ADD CONSTRAINT IF NOT EXISTS garmin_logs_date_unique UNIQUE (date);

-- =============================================================================
-- Done. Both tables are created with indexes, triggers, and RLS policies.
-- =============================================================================

-- =============================================================================
-- Strava Integration Tables
-- Run this block in the Supabase SQL Editor to add Strava support.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- strava_tokens
-- Single-user app — only one row ever stored.
-- Never expose to anon clients; read via service role key only.
-- ---------------------------------------------------------------------------
create table if not exists public.strava_tokens (
  id           uuid        primary key default gen_random_uuid(),
  access_token text        not null,
  refresh_token text       not null,
  expires_at   bigint      not null,
  athlete_id   bigint      not null,
  athlete_name text,
  athlete_avatar text,
  last_sync_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Row-level security — no anon access (tokens are sensitive)
alter table public.strava_tokens enable row level security;

-- ---------------------------------------------------------------------------
-- strava_activities
-- One row per Strava activity. day_key links to training_plan.
-- ---------------------------------------------------------------------------
create table if not exists public.strava_activities (
  id                   uuid    primary key default gen_random_uuid(),
  strava_id            bigint  not null unique,
  day_key              text,                        -- "Jun_13" — matched to training plan
  name                 text,
  type                 text,
  sport_type           text,
  start_date           text,
  distance             numeric,                     -- metres
  moving_time          integer,                     -- seconds
  elapsed_time         integer,                     -- seconds
  total_elevation_gain numeric,                     -- metres
  average_speed        numeric,                     -- m/s
  max_speed            numeric,
  average_heartrate    numeric,
  max_heartrate        numeric,
  average_cadence      numeric,
  suffer_score         integer,
  calories             numeric,
  map_polyline         text,                        -- full resolution polyline
  map_summary_polyline text,                        -- summary polyline (faster to decode)
  splits_metric        jsonb,                       -- per-km splits
  laps                 jsonb,
  best_efforts         jsonb,
  raw_data             jsonb,                       -- full Strava API response
  created_at           timestamptz not null default now()
);

-- Indexes
create index if not exists idx_strava_activities_day_key    on public.strava_activities (day_key);
create index if not exists idx_strava_activities_start_date on public.strava_activities (start_date);
create index if not exists idx_strava_activities_strava_id  on public.strava_activities (strava_id);

-- RLS — anon can read activities (used by client-side pages)
alter table public.strava_activities enable row level security;

drop policy if exists "anon_read_strava_activities" on public.strava_activities;
create policy "anon_read_strava_activities"
  on public.strava_activities
  for select
  to anon
  using (true);

-- =============================================================================
-- End Strava tables
-- =============================================================================
