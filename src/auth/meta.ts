import { SYNC_META_KEY, USERNAME_KEY, type SyncMeta } from './types'

const emptyMeta = (): SyncMeta => ({
  localUpdatedAt: 0,
  remoteUpdatedAt: 0,
  remoteRevision: 0,
  pendingPush: false,
  lastPushAt: null,
  lastPullAt: null,
  lastError: null,
})

export function loadSyncMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY)
    if (!raw) return emptyMeta()
    return { ...emptyMeta(), ...(JSON.parse(raw) as SyncMeta) }
  } catch {
    return emptyMeta()
  }
}

export function saveSyncMeta(meta: SyncMeta): void {
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta))
}

export function markLocalDirty(): SyncMeta {
  const meta = loadSyncMeta()
  meta.localUpdatedAt = Date.now()
  meta.pendingPush = true
  meta.lastError = null
  saveSyncMeta(meta)
  return meta
}

export function saveUsername(username: string): void {
  localStorage.setItem(USERNAME_KEY, username.trim().toLowerCase())
}

export function loadUsername(): string | null {
  return localStorage.getItem(USERNAME_KEY)
}

export function clearUsername(): void {
  localStorage.removeItem(USERNAME_KEY)
}

