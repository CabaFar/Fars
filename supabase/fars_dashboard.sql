-- شغّل هذا الملف مرة واحدة من SQL Editor في مشروع Supabase.
-- بعدها اربط الرابط والمفتاح anon من شريط النسخة الاحتياطية في شاورما البسيط.

create table if not exists public.fars_dashboard (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.fars_dashboard enable row level security;

drop policy if exists "fars_dashboard_anon_read" on public.fars_dashboard;
create policy "fars_dashboard_anon_read"
  on public.fars_dashboard for select
  to anon
  using (id = 'fars');

drop policy if exists "fars_dashboard_anon_insert" on public.fars_dashboard;
create policy "fars_dashboard_anon_insert"
  on public.fars_dashboard for insert
  to anon
  with check (id = 'fars');

drop policy if exists "fars_dashboard_anon_update" on public.fars_dashboard;
create policy "fars_dashboard_anon_update"
  on public.fars_dashboard for update
  to anon
  using (id = 'fars')
  with check (id = 'fars');
