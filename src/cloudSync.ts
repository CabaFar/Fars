import { FULL_BACKUP_KIND, collectBackup, restoreBackup, type FullBackup } from './backup'
import { getBrandId } from './brand'
import { CLOUD_DIRTY_KEY, LOCAL_CHANGE_EVENT } from './notifyChange'

export const CLOUD_ROW_ID = 'fars'
export const CLOUD_TABLE = 'fars_dashboard'
export const CLOUD_URL_KEY = 'shawarma-supabase-url'
export const CLOUD_ANON_KEY = 'shawarma-supabase-anon'

export const FARS_DASHBOARD_SQL = `create table if not exists public.fars_dashboard (
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
`

const PUSH_DELAY_MS = 800

type FileConfig = { url?: string; anonKey?: string }

export type CloudStatus = {
  enabled: boolean
  configured: boolean
  ready: boolean
  syncing: boolean
  lastError: string | null
  lastSyncedAt: string | null
}

let fileConfig: FileConfig = {}
let ready = false
let syncing = false
let lastError: string | null = null
let lastSyncedAt: string | null = null
let pushTimer = 0
let started = false

function emitStatus(): void {
  window.dispatchEvent(new Event('shawarma-cloud-status'))
}

function envUrl(): string {
  return String(import.meta.env.SHAWARMA_SUPABASE_URL ?? '').trim()
}

function envAnon(): string {
  return String(import.meta.env.SHAWARMA_SUPABASE_ANON_KEY ?? '').trim()
}

function readLocal(key: string): string {
  try {
    return (localStorage.getItem(key) ?? '').trim()
  } catch {
    return ''
  }
}

export function readSavedCloudConfig(): { url: string; anonKey: string } {
  return {
    url: readLocal(CLOUD_URL_KEY),
    anonKey: readLocal(CLOUD_ANON_KEY),
  }
}

export function getCloudConfig(): { url: string; anonKey: string } {
  const saved = readSavedCloudConfig()
  return {
    url: (envUrl() || saved.url || fileConfig.url || '').trim().replace(/\/+$/, ''),
    anonKey: (envAnon() || saved.anonKey || fileConfig.anonKey || '').trim(),
  }
}

export function cloudEnabled(): boolean {
  return getBrandId() === 'fars'
}

export function cloudConfigured(): boolean {
  const { url, anonKey } = getCloudConfig()
  return Boolean(url && anonKey)
}

export function getCloudStatus(): CloudStatus {
  return {
    enabled: cloudEnabled(),
    configured: cloudConfigured(),
    ready,
    syncing,
    lastError,
    lastSyncedAt,
  }
}

export function subscribeCloudStatus(onChange: () => void): () => void {
  window.addEventListener('shawarma-cloud-status', onChange)
  return () => window.removeEventListener('shawarma-cloud-status', onChange)
}

export function saveCloudConfig(url: string, anonKey: string): void {
  localStorage.setItem(CLOUD_URL_KEY, url.trim().replace(/\/+$/, ''))
  localStorage.setItem(CLOUD_ANON_KEY, anonKey.trim())
  ready = false
  lastError = null
  emitStatus()
}

function isDirty(): boolean {
  return readLocal(CLOUD_DIRTY_KEY) === '1'
}

function clearDirty(): void {
  try {
    localStorage.removeItem(CLOUD_DIRTY_KEY)
  } catch {
    /* ignore */
  }
}

function hasLocalDashboard(): boolean {
  const backup = collectBackup()
  return Object.values(backup.stores).some((value) => value != null)
}

function isFullBackup(value: unknown): value is FullBackup {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as FullBackup).kind === FULL_BACKUP_KIND &&
      (value as FullBackup).stores &&
      typeof (value as FullBackup).stores === 'object',
  )
}

function restHeaders(anonKey: string): HeadersInit {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation,resolution=merge-duplicates',
  }
}

function restUrl(base: string, path: string): string {
  return `${base}/rest/v1/${path}`
}

function explainError(status: number, body: string): string {
  if (status === 404 || body.includes('schema cache') || body.includes('does not exist')) {
    return 'الجدول غير موجود. انسخ أمر SQL مرة واحدة من الأسفل وشغّله في Supabase.'
  }
  if (status === 401 || status === 403) {
    return 'المفتاح أو صلاحيات الجدول غير صحيحة. تأكد من مفتاح anon ومن سياسات الأمان.'
  }
  return 'تعذر الاتصال بـ Supabase. تحقق من الرابط والمفتاح.'
}

async function loadFileConfig(): Promise<void> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}cloud.json`, { cache: 'no-store' })
    if (!res.ok) return
    const json = (await res.json()) as FileConfig
    if (json && typeof json === 'object') fileConfig = json
  } catch {
    /* optional file */
  }
}

async function fetchCloudRow(): Promise<{ payload: FullBackup; updatedAt: string } | null> {
  const { url, anonKey } = getCloudConfig()
  const res = await fetch(
    restUrl(url, `${CLOUD_TABLE}?id=eq.${encodeURIComponent(CLOUD_ROW_ID)}&select=payload,updated_at`),
    { headers: restHeaders(anonKey) },
  )
  const text = await res.text()
  if (!res.ok) throw new Error(explainError(res.status, text))
  const rows = JSON.parse(text) as Array<{ payload?: unknown; updated_at?: string }>
  const row = rows[0]
  if (!row || !isFullBackup(row.payload)) return null
  return { payload: row.payload, updatedAt: row.updated_at ?? '' }
}

export async function flushCloudPush(): Promise<void> {
  if (!cloudEnabled() || !cloudConfigured()) return
  const { url, anonKey } = getCloudConfig()
  const payload = collectBackup()
  syncing = true
  emitStatus()
  try {
    const res = await fetch(restUrl(url, `${CLOUD_TABLE}?on_conflict=id`), {
      method: 'POST',
      headers: restHeaders(anonKey),
      body: JSON.stringify({
        id: CLOUD_ROW_ID,
        payload,
        updated_at: new Date().toISOString(),
      }),
    })
    const text = await res.text()
    if (!res.ok) throw new Error(explainError(res.status, text))
    clearDirty()
    lastError = null
    lastSyncedAt = new Date().toISOString()
  } catch (err) {
    lastError = err instanceof Error ? err.message : 'تعذر حفظ النسخة على الرابط.'
    throw err
  } finally {
    syncing = false
    ready = true
    emitStatus()
  }
}

export function scheduleCloudPush(): void {
  if (!cloudEnabled() || !cloudConfigured() || !ready) return
  window.clearTimeout(pushTimer)
  pushTimer = window.setTimeout(() => {
    void flushCloudPush().catch(() => {
      /* status already recorded */
    })
  }, PUSH_DELAY_MS)
}

async function hydrateFromCloud(): Promise<void> {
  if (!cloudEnabled() || !cloudConfigured()) {
    ready = true
    return
  }
  if (isDirty()) {
    try {
      await flushCloudPush()
    } catch {
      ready = true
      emitStatus()
    }
    return
  }
  try {
    const remote = await fetchCloudRow()
    if (remote) {
      restoreBackup(remote.payload)
      lastSyncedAt = remote.updatedAt || new Date().toISOString()
      lastError = null
    } else if (hasLocalDashboard()) {
      await flushCloudPush()
      return
    }
    ready = true
    emitStatus()
  } catch (err) {
    lastError = err instanceof Error ? err.message : 'تعذر قراءة النسخة من الرابط.'
    ready = true
    emitStatus()
  }
}

function listenForLocalChanges(): void {
  if (started) return
  started = true
  window.addEventListener(LOCAL_CHANGE_EVENT, () => {
    scheduleCloudPush()
  })
}

export async function prepareCloud(): Promise<void> {
  if (!cloudEnabled()) {
    ready = true
    return
  }
  await loadFileConfig()
  listenForLocalChanges()
  emitStatus()
  await hydrateFromCloud()
}
