export const APP_DATA_KEYS = [
  'shawarma-accounting-aug-2026-v1',
  'daily-cash-ledger-aug-2026-v1',
  'shawarma-inventory-v1',
  'shawarma-inventory-prices-v1',
  'shawarma-inventory-extras-v1',
  'shawarma-inventory-units-v1',
  'shawarma-inventory-removed-v1',
  'shawarma-inventory-meta-v1',
  'shawarma-hr-employees-v1',
] as const

export const DATA_CHANGED_EVENT = 'fars-data-changed'
export const SYNC_META_KEY = 'fars-sync-meta-v1'
export const USERNAME_KEY = 'fars-username-v1'

export type VaultKeys = Record<string, string>

export type SyncMeta = {
  localUpdatedAt: number
  remoteUpdatedAt: number
  remoteRevision: number
  pendingPush: boolean
  lastPushAt: number | null
  lastPullAt: number | null
  lastError: string | null
}

export type SyncStatus = {
  online: boolean
  phase: 'idle' | 'syncing' | 'offline' | 'error' | 'ok'
  message: string
  username: string | null
  lastSavedAt: number | null
}

export type WorkspaceRow = {
  user_id: string
  keys: VaultKeys
  updated_at: string
  revision: number
}
