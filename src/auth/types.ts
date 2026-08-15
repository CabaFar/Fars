export type VaultPayload = {
  v: 1
  keys: Record<string, string>
  updatedAt: number
}

export type EncryptedBlob = {
  v: 1
  username: string
  salt: string
  iv: string
  ciphertext: string
  updatedAt: number
}

export type LocalAccount = {
  salt: string
  hash: string
  createdAt: number
}

export type AccountsFile = {
  v: 1
  users: Record<string, LocalAccount>
}

export type SessionInfo = {
  username: string
  remember: boolean
}

export type SyncStatus = {
  local: boolean
  cloud: 'idle' | 'saving' | 'ok' | 'error' | 'need-login'
  cloudMessage: string
  disk: 'idle' | 'ok' | 'error' | 'none'
  lastSavedAt: number | null
}

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

export const ACCOUNTS_KEY = 'fars-accounts-v1'
export const SESSION_KEY = 'fars-session-v1'
export const REMEMBER_KEY = 'fars-remember-v1'
export const KEY_MATERIAL_KEY = 'fars-key-jwk-v1'
export const DISK_HANDLE_KEY = 'fars-disk-handle-v1'
export const DATA_CHANGED_EVENT = 'fars-data-changed'

/** kvdb.io bucket — يفعّل بعد تأكيد البريد */
export const KVDB_BUCKET = 'JiVqviTVSZesTH7vaH2yo7'
export const PUTER_KEY_PREFIX = 'fars-vault:'
