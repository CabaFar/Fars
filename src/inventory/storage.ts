import { getBrand, storageKey } from '../brand'
import { notifyLocalChange } from '../notifyChange'
import type { CategoryId, ExtraItem } from './catalog'
import type { InventoryData, PriceList, UnitOverrides } from './types'
import { emptyInventoryData, emptyPriceList } from './types'

const STORAGE_KEY = 'shawarma-inventory-v1'
const PRICE_KEY = 'shawarma-inventory-prices-v1'
const EXTRA_KEY = 'shawarma-inventory-extras-v1'
const UNITS_KEY = 'shawarma-inventory-units-v1'
const REMOVED_KEY = 'shawarma-inventory-removed-v1'
const META_KEY = 'shawarma-inventory-meta-v1'

export const INVENTORY_BASE_KEYS = [
  STORAGE_KEY,
  PRICE_KEY,
  EXTRA_KEY,
  UNITS_KEY,
  REMOVED_KEY,
  META_KEY,
] as const

export function inventoryStorageKeys() {
  return INVENTORY_BASE_KEYS.map((key) => storageKey(key))
}

export function inventoryKeyMap() {
  return {
    data: storageKey(STORAGE_KEY),
    prices: storageKey(PRICE_KEY),
    extras: storageKey(EXTRA_KEY),
    units: storageKey(UNITS_KEY),
    removed: storageKey(REMOVED_KEY),
    meta: storageKey(META_KEY),
  }
}

export type ItemMetaOverride = { name?: string; category?: CategoryId }
export type ItemMetaOverrides = Record<string, ItemMetaOverride>

export function loadInventory(): InventoryData {
  try {
    const raw = localStorage.getItem(storageKey(STORAGE_KEY))
    if (!raw) return emptyInventoryData()
    const parsed = JSON.parse(raw) as InventoryData
    return {
      wasita: parsed.wasita ?? {},
      beirut: parsed.beirut ?? {},
    }
  } catch {
    return emptyInventoryData()
  }
}

export function saveInventory(data: InventoryData): void {
  localStorage.setItem(storageKey(STORAGE_KEY), JSON.stringify(data))
  notifyLocalChange()
}

export function loadPrices(): PriceList {
  try {
    const raw = localStorage.getItem(storageKey(PRICE_KEY))
    if (!raw) return emptyPriceList()
    const parsed = JSON.parse(raw) as PriceList
    return {
      wasita: parsed.wasita ?? {},
      beirut: parsed.beirut ?? {},
    }
  } catch {
    return emptyPriceList()
  }
}

export function savePrices(prices: PriceList): void {
  localStorage.setItem(storageKey(PRICE_KEY), JSON.stringify(prices))
  notifyLocalChange()
}

export function loadExtras(): ExtraItem[] {
  try {
    const raw = localStorage.getItem(storageKey(EXTRA_KEY))
    if (!raw) return []
    const parsed = JSON.parse(raw) as ExtraItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveExtras(items: ExtraItem[]): void {
  localStorage.setItem(storageKey(EXTRA_KEY), JSON.stringify(items))
  notifyLocalChange()
}

export function loadUnitOverrides(): UnitOverrides {
  try {
    const raw = localStorage.getItem(storageKey(UNITS_KEY))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as UnitOverrides
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveUnitOverrides(units: UnitOverrides): void {
  localStorage.setItem(storageKey(UNITS_KEY), JSON.stringify(units))
  notifyLocalChange()
}

export function loadRemovedIds(): string[] {
  try {
    const raw = localStorage.getItem(storageKey(REMOVED_KEY))
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function saveRemovedIds(ids: string[]): void {
  localStorage.setItem(storageKey(REMOVED_KEY), JSON.stringify(ids))
  notifyLocalChange()
}

export function loadMetaOverrides(): ItemMetaOverrides {
  try {
    const raw = localStorage.getItem(storageKey(META_KEY))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ItemMetaOverrides
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveMetaOverrides(meta: ItemMetaOverrides): void {
  localStorage.setItem(storageKey(META_KEY), JSON.stringify(meta))
  notifyLocalChange()
}

export type BackupPayload = {
  version: number
  data: InventoryData
  prices: PriceList
  extras: ExtraItem[]
  units: UnitOverrides
  removedIds?: string[]
  meta?: ItemMetaOverrides
}

export function exportInventory(payload: BackupPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${getBrand().backupFile.replace('-backup', '')}-inventory-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importInventory(file: File): Promise<BackupPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<BackupPayload> & {
          wasita?: InventoryData['wasita']
          beirut?: InventoryData['beirut']
        }
        if (parsed.data) {
          resolve({
            version: 5,
            data: {
              wasita: parsed.data.wasita ?? {},
              beirut: parsed.data.beirut ?? {},
            },
            prices: {
              wasita: parsed.prices?.wasita ?? {},
              beirut: parsed.prices?.beirut ?? {},
            },
            extras: parsed.extras ?? [],
            units: parsed.units ?? {},
            removedIds: parsed.removedIds ?? [],
            meta: parsed.meta ?? {},
          })
          return
        }
        resolve({
          version: 5,
          data: {
            wasita: parsed.wasita ?? {},
            beirut: parsed.beirut ?? {},
          },
          prices: emptyPriceList(),
          extras: [],
          units: {},
          removedIds: [],
          meta: {},
        })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
