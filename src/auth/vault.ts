import { APP_DATA_KEYS, DATA_CHANGED_EVENT, type VaultKeys } from './types'

export function collectVaultKeys(): VaultKeys {
  const keys: VaultKeys = {}
  for (const key of APP_DATA_KEYS) {
    const value = localStorage.getItem(key)
    if (value != null) keys[key] = value
  }
  return keys
}

export function applyVaultKeys(keys: VaultKeys, source = 'cloud'): void {
  for (const key of APP_DATA_KEYS) {
    if (Object.prototype.hasOwnProperty.call(keys, key)) {
      localStorage.setItem(key, keys[key]!)
    }
  }
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail: { source } }))
}

export function notifyDataChanged(source = 'local'): void {
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail: { source } }))
}

export function vaultFingerprint(keys: VaultKeys): string {
  return APP_DATA_KEYS.map((k) => `${k}:${keys[k] ?? ''}`).join('|')
}
