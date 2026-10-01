-- NEXA frontend feature tables
-- Run this ONCE in Supabase SQL Editor after the device tables already exist.

create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  notes text,
  status text not null default 'todo' check (status in ('todo','in_progress','completed','skipped')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  scheduled_for timestamptz,
  estimate_minutes integer not null default 25 check (estimate_minutes between 1 and 480),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists tasks_user_status_idx on public.tasks(user_id, status);
create index if not exists tasks_user_schedule_idx on public.tasks(user_id, scheduled_for);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  planned_minutes integer not null default 25 check (planned_minutes between 1 and 180),
  focused_seconds integer not null default 0 check (focused_seconds >= 0),
  status text not null default 'running' check (status in ('running','paused','completed','cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists focus_sessions_user_started_idx on public.focus_sessions(user_id, started_at desc);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  focus_minutes integer not null default 25 check (focus_minutes between 1 and 180),
  break_minutes integer not null default 5 check (break_minutes between 1 and 60),
  sounds_enabled boolean not null default true,
  quiet_start time,
  quiet_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_goals (
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_date date not null,
  task_target integer not null default 3 check (task_target between 1 and 30),
  focus_minutes_target integer not null default 60 check (focus_minutes_target between 1 and 720),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, goal_date)
);

alter table public.tasks enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.user_settings enable row level security;
alter table public.daily_goals enable row level security;

revoke all on public.tasks, public.focus_sessions, public.user_settings, public.daily_goals from anon;
grant select, insert, update, delete on public.tasks, public.focus_sessions, public.user_settings, public.daily_goals to authenticated;

-- Idempotently replace policies so this migration can be re-run safely.
drop policy if exists "Users manage own tasks" on public.tasks;
create policy "Users manage own tasks" on public.tasks
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own focus sessions" on public.focus_sessions;
create policy "Users manage own focus sessions" on public.focus_sessions
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own settings" on public.user_settings;
create policy "Users manage own settings" on public.user_settings
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own daily goals" on public.daily_goals;
create policy "Users manage own daily goals" on public.daily_goals
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
