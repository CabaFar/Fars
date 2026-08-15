import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import { loadSyncMeta, markLocalDirty, saveSyncMeta } from './meta'
import {
  DATA_CHANGED_EVENT,
  type SyncStatus,
  type VaultKeys,
  type WorkspaceRow,
} from './types'
import { applyVaultKeys, collectVaultKeys, vaultFingerprint } from './vault'

type Listener = (status: SyncStatus) => void

const listeners = new Set<Listener>()
let status: SyncStatus = {
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  phase: 'idle',
  message: '',
  username: null,
  lastSavedAt: null,
}
let started = false
let syncing = false
let debounceTimer: number | null = null
let channel: RealtimeChannel | null = null
let lastFingerprint = ''
let authUserId: string | null = null

function emit(): void {
  for (const l of listeners) l({ ...status })
}

export function subscribeSync(listener: Listener): () => void {
  listeners.add(listener)
  listener({ ...status })
  return () => listeners.delete(listener)
}

export function getSyncStatus(): SyncStatus {
  return { ...status }
}

function setStatus(partial: Partial<SyncStatus>): void {
  status = { ...status, ...partial }
  emit()
}

async function currentUserId(): Promise<string | null> {
  if (authUserId) return authUserId
  if (!isSupabaseConfigured()) return null
  const { data } = await getSupabase().auth.getSession()
  authUserId = data.session?.user.id ?? null
  return authUserId
}

export async function pushLocal(force = false): Promise<void> {
  if (!isSupabaseConfigured() || !navigator.onLine) {
    setStatus({
      online: navigator.onLine,
      phase: navigator.onLine ? status.phase : 'offline',
      message: navigator.onLine ? status.message : 'بدون إنترنت — الحفظ محلي فقط',
    })
    return
  }
  const userId = await currentUserId()
  if (!userId || syncing) return

  const meta = loadSyncMeta()
  const keys = collectVaultKeys()
  const fp = vaultFingerprint(keys)
  if (!force && !meta.pendingPush && fp === lastFingerprint) return

  syncing = true
  setStatus({ phase: 'syncing', message: 'جاري المزامنة مع القاعدة…', online: true })

  try {
    const supabase = getSupabase()
    const { data: remote, error: readError } = await supabase
      .from('workspace_data')
      .select('user_id, keys, updated_at, revision')
      .eq('user_id', userId)
      .maybeSingle()

    if (readError) throw readError

    const remoteRow = remote as WorkspaceRow | null
    const remoteMs = remoteRow ? Date.parse(remoteRow.updated_at) : 0

    // إن كانت السحابة أحدث ولم نفرض الرفع، اسحب أولاً
    if (!force && remoteRow && remoteMs > meta.localUpdatedAt) {
      applyRemote(remoteRow)
      syncing = false
      setStatus({ phase: 'ok', message: 'تم جلب نسخة أحدث من السحابة', lastSavedAt: Date.now() })
      return
    }

    const payload = {
      user_id: userId,
      keys,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('workspace_data')
      .upsert(payload, { onConflict: 'user_id' })
      .select('user_id, keys, updated_at, revision')
      .single()

    if (error) throw error
    const saved = data as WorkspaceRow
    const next = loadSyncMeta()
    next.pendingPush = false
    next.lastPushAt = Date.now()
    next.remoteUpdatedAt = Date.parse(saved.updated_at)
    next.remoteRevision = saved.revision
    next.localUpdatedAt = Math.max(next.localUpdatedAt, next.remoteUpdatedAt)
    next.lastError = null
    saveSyncMeta(next)
    lastFingerprint = fp
    setStatus({
      phase: 'ok',
      message: 'تمت المزامنة مع PostgreSQL',
      lastSavedAt: next.lastPushAt,
      online: true,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'فشل المزامنة'
    const next = loadSyncMeta()
    next.lastError = message
    next.pendingPush = true
    saveSyncMeta(next)
    setStatus({ phase: 'error', message, online: navigator.onLine })
  } finally {
    syncing = false
  }
}

function applyRemote(row: WorkspaceRow): void {
  applyVaultKeys(row.keys as VaultKeys, 'cloud')
  const next = loadSyncMeta()
  next.remoteUpdatedAt = Date.parse(row.updated_at)
  next.remoteRevision = row.revision
  next.localUpdatedAt = next.remoteUpdatedAt
  next.pendingPush = false
  next.lastPullAt = Date.now()
  next.lastError = null
  saveSyncMeta(next)
  lastFingerprint = vaultFingerprint(collectVaultKeys())
}

export async function pullAndMerge(): Promise<void> {
  if (!isSupabaseConfigured() || !navigator.onLine) return
  const userId = await currentUserId()
  if (!userId) return

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('workspace_data')
    .select('user_id, keys, updated_at, revision')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return

  const row = data as WorkspaceRow
  const meta = loadSyncMeta()
  const remoteMs = Date.parse(row.updated_at)

  if (meta.pendingPush && meta.localUpdatedAt > remoteMs) {
    // المحلي أحدث — ارفعه
    await pushLocal(true)
    return
  }

  if (remoteMs >= meta.localUpdatedAt) {
    applyRemote(row)
    setStatus({
      phase: 'ok',
      message: 'تم التحديث من الأجهزة الأخرى',
      lastSavedAt: Date.now(),
      online: true,
    })
  }
}

function schedulePush(): void {
  markLocalDirty()
  setStatus({
    online: navigator.onLine,
    phase: navigator.onLine ? 'syncing' : 'offline',
    message: navigator.onLine ? 'حفظ محلي… جاري الرفع' : 'حفظ محلي (بدون إنترنت)',
    lastSavedAt: Date.now(),
  })
  if (debounceTimer) window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    void pushLocal(false)
  }, 900)
}

function onDataChanged(ev: Event): void {
  const detail = (ev as CustomEvent<{ source?: string }>).detail
  if (detail?.source === 'cloud') {
    lastFingerprint = vaultFingerprint(collectVaultKeys())
    return
  }
  schedulePush()
}

async function subscribeRealtime(): Promise<void> {
  if (!isSupabaseConfigured() || channel) return
  const userId = await currentUserId()
  if (!userId) return
  const supabase = getSupabase()
  channel = supabase
    .channel(`workspace-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'workspace_data',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = (payload.new || payload.old) as WorkspaceRow | undefined
        if (!row || !row.keys) return
        const meta = loadSyncMeta()
        const remoteMs = Date.parse(row.updated_at)
        // تجاهل الصدى إن كنا نحن من رفعنا للتو
        if (meta.pendingPush && meta.localUpdatedAt > remoteMs) return
        if (remoteMs < meta.localUpdatedAt) return
        applyRemote(row)
        setStatus({
          phase: 'ok',
          message: 'مزامنة فورية من جهاز آخر',
          lastSavedAt: Date.now(),
          online: true,
        })
      },
    )
    .subscribe()
}

export function startSyncEngine(username?: string | null): void {
  if (started) return
  started = true
  if (username) setStatus({ username })
  else setStatus({ username: status.username })

  lastFingerprint = vaultFingerprint(collectVaultKeys())
  window.addEventListener(DATA_CHANGED_EVENT, onDataChanged)
  window.addEventListener('online', () => {
    setStatus({ online: true, phase: 'syncing', message: 'عاد الاتصال — جاري المزامنة' })
    void pullAndMerge().then(() => pushLocal(true))
  })
  window.addEventListener('offline', () => {
    setStatus({ online: false, phase: 'offline', message: 'بدون إنترنت — العمل مستمر محلياً' })
  })
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void pushLocal(true)
  })
  window.setInterval(() => {
    if (navigator.onLine) void pushLocal(false)
  }, 20_000)

  void subscribeRealtime()
  if (navigator.onLine) void pushLocal(false)
  else setStatus({ online: false, phase: 'offline', message: 'بدون إنترنت — العمل مستمر محلياً' })
}

export function stopSyncEngine(): void {
  started = false
  authUserId = null
  window.removeEventListener(DATA_CHANGED_EVENT, onDataChanged)
  if (debounceTimer) window.clearTimeout(debounceTimer)
  if (channel && isSupabaseConfigured()) {
    void getSupabase().removeChannel(channel)
  }
  channel = null
}

export async function flushSync(): Promise<void> {
  await pushLocal(true)
}
