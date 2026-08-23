-- Fars restaurant platform — Supabase / PostgreSQL schema
-- Run once in: Supabase Dashboard → SQL Editor → New query → Run

-- 1) Profiles (username ↔ auth user)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles (username);

-- 2) Workspace blob (all app localStorage keys as JSON) — offline-first sync unit
create table if not exists public.workspace_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  keys jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  revision bigint not null default 1
);

-- 3) Row Level Security: each user only sees their own rows
alter table public.profiles enable row level security;
alter table public.workspace_data enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "workspace_select_own" on public.workspace_data;
drop policy if exists "workspace_insert_own" on public.workspace_data;
drop policy if exists "workspace_update_own" on public.workspace_data;
drop policy if exists "workspace_delete_own" on public.workspace_data;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "workspace_select_own"
  on public.workspace_data for select
  using (auth.uid() = user_id);

create policy "workspace_insert_own"
  on public.workspace_data for insert
  with check (auth.uid() = user_id);

create policy "workspace_update_own"
  on public.workspace_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workspace_delete_own"
  on public.workspace_data for delete
  using (auth.uid() = user_id);

-- 4) Realtime: push changes to other open devices instantly
alter table public.workspace_data replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.workspace_data;
  exception
    when duplicate_object then null;
  end;
end $$;

-- 5) Auto-bump revision + updated_at on write
create or replace function public.touch_workspace_data()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  new.revision = coalesce(old.revision, 0) + 1;
  return new;
end;
$$;

drop trigger if exists workspace_data_touch on public.workspace_data;
create trigger workspace_data_touch
  before update on public.workspace_data
  for each row
  execute function public.touch_workspace_data();
