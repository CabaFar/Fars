import { getBrand, storageKey } from './brand'
import { accountingStorageKey } from './storage'
import { cashStorageKey } from './cash/storage'
import { hrStorageKey } from './hr/storage'
import { INVENTORY_BASE_KEYS, inventoryKeyMap, inventoryStorageKeys } from './inventory/storage'

export const FULL_BACKUP_KIND = 'shawarma-full-backup'
export const FULL_BACKUP_VERSION = 1

export function allStorageKeys(): string[] {
  return [accountingStorageKey(), cashStorageKey(), hrStorageKey(), ...inventoryStorageKeys()]
}

export type RestoreKind = 'full' | 'inventory'

export type FullBackup = {
  kind: typeof FULL_BACKUP_KIND
  version: number
  brand?: string
  exportedAt: string
  stores: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseStored(raw: string | null): unknown {
  if (raw == null) return null
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function baseKeys(): string[] {
  return [
    'shawarma-accounting-aug-2026-v1',
    'daily-cash-ledger-aug-2026-v1',
    'shawarma-hr-employees-v1',
    ...INVENTORY_BASE_KEYS,
  ]
}

function readStore(stores: Record<string, unknown>, base: string): { found: boolean; value: unknown } {
  if (base in stores) return { found: true, value: stores[base] }
  const scoped = storageKey(base)
  if (scoped in stores) return { found: true, value: stores[scoped] }
  return { found: false, value: undefined }
}

export function collectBackup(): FullBackup {
  const stores: Record<string, unknown> = {}
  for (const base of baseKeys()) {
    stores[base] = parseStored(localStorage.getItem(storageKey(base)))
  }
  return {
    kind: FULL_BACKUP_KIND,
    version: FULL_BACKUP_VERSION,
    brand: getBrand().id,
    exportedAt: new Date().toISOString(),
    stores,
  }
}

export function downloadBackup(): void {
  const blob = new Blob([JSON.stringify(collectBackup(), null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${getBrand().backupFile}-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function readBackupFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)))
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export function inspectBackup(parsed: unknown): RestoreKind {
  if (!isRecord(parsed)) throw new Error('invalid-backup')
  if (parsed.kind === FULL_BACKUP_KIND && isRecord(parsed.stores)) return 'full'
  if (isInventoryPayload(parsed)) return 'inventory'
  throw new Error('invalid-backup')
}

function isInventoryPayload(parsed: Record<string, unknown>): boolean {
  if (isRecord(parsed.data) && ('wasita' in parsed.data || 'beirut' in parsed.data)) {
    return true
  }
  const hasInventoryFields =
    'prices' in parsed || 'extras' in parsed || 'units' in parsed || 'removedIds' in parsed
  return hasInventoryFields && typeof parsed.version === 'number'
}

function writeValue(key: string, value: unknown): void {
  if (value == null) {
    localStorage.removeItem(key)
    return
  }
  localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
}

function restoreFull(parsed: Record<string, unknown>): void {
  const stores = parsed.stores
  if (!isRecord(stores)) throw new Error('invalid-backup')
  for (const base of baseKeys()) {
    const hit = readStore(stores, base)
    if (!hit.found) continue
    writeValue(storageKey(base), hit.value)
  }
}

function restoreInventory(parsed: Record<string, unknown>): void {
  const keys = inventoryKeyMap()
  const data = isRecord(parsed.data)
    ? {
        wasita: parsed.data.wasita ?? {},
        beirut: parsed.data.beirut ?? {},
      }
    : {
        wasita: parsed.wasita ?? {},
        beirut: parsed.beirut ?? {},
      }
  writeValue(keys.data, data)
  if ('prices' in parsed) writeValue(keys.prices, parsed.prices ?? { wasita: {}, beirut: {} })
  if ('extras' in parsed) writeValue(keys.extras, parsed.extras ?? [])
  if ('units' in parsed) writeValue(keys.units, parsed.units ?? {})
  if ('removedIds' in parsed) writeValue(keys.removed, parsed.removedIds ?? [])
  if ('meta' in parsed) writeValue(keys.meta, parsed.meta ?? {})
}

export function restoreBackup(parsed: unknown): RestoreKind {
  const kind = inspectBackup(parsed)
  if (!isRecord(parsed)) throw new Error('invalid-backup')
  if (kind === 'full') restoreFull(parsed)
  else restoreInventory(parsed)
  return kind
}
