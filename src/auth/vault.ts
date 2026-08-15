import { APP_DATA_KEYS, DATA_CHANGED_EVENT, type VaultPayload } from './types'

export function collectVaultPayload(): VaultPayload {
  const keys: Record<string, string> = {}
  for (const key of APP_DATA_KEYS) {
    const value = localStorage.getItem(key)
    if (value != null) keys[key] = value
  }
  return { v: 1, keys, updatedAt: Date.now() }
}

export function applyVaultPayload(payload: VaultPayload): void {
  for (const key of APP_DATA_KEYS) {
    if (Object.prototype.hasOwnProperty.call(payload.keys, key)) {
      localStorage.setItem(key, payload.keys[key]!)
    }
  }
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail: { source: 'cloud' } }))
}

export function vaultFingerprint(payload: VaultPayload): string {
  const ordered = APP_DATA_KEYS.map((k) => `${k}:${payload.keys[k] ?? ''}`).join('|')
  return `${payload.updatedAt}:${ordered.length}:${ordered.slice(0, 200)}`
}

export function notifyDataChanged(source = 'local'): void {
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail: { source } }))
}
