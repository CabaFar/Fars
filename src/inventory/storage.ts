import { notifyDataChanged } from '../auth/vault'
import type { CategoryId, ExtraItem } from './catalog'
import type { InventoryData, PriceList, UnitOverrides } from './types'
import { emptyInventoryData, emptyPriceList } from './types'

const STORAGE_KEY = 'shawarma-inventory-v1'
const PRICE_KEY = 'shawarma-inventory-prices-v1'
const EXTRA_KEY = 'shawarma-inventory-extras-v1'
const UNITS_KEY = 'shawarma-inventory-units-v1'
const REMOVED_KEY = 'shawarma-inventory-removed-v1'
const META_KEY = 'shawarma-inventory-meta-v1'

export type ItemMetaOverride = { name?: string; category?: CategoryId }
export type ItemMetaOverrides = Record<string, ItemMetaOverride>

export function loadInventory(): InventoryData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  notifyDataChanged()
}

export function loadPrices(): PriceList {
  try {
    const raw = localStorage.getItem(PRICE_KEY)
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
  localStorage.setItem(PRICE_KEY, JSON.stringify(prices))
  notifyDataChanged()
}

export function loadExtras(): ExtraItem[] {
  try {
    const raw = localStorage.getItem(EXTRA_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ExtraItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveExtras(items: ExtraItem[]): void {
  localStorage.setItem(EXTRA_KEY, JSON.stringify(items))
  notifyDataChanged()
}

export function loadUnitOverrides(): UnitOverrides {
  try {
    const raw = localStorage.getItem(UNITS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as UnitOverrides
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveUnitOverrides(units: UnitOverrides): void {
  localStorage.setItem(UNITS_KEY, JSON.stringify(units))
  notifyDataChanged()
}

export function loadRemovedIds(): string[] {
  try {
    const raw = localStorage.getItem(REMOVED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function saveRemovedIds(ids: string[]): void {
  localStorage.setItem(REMOVED_KEY, JSON.stringify(ids))
  notifyDataChanged()
}

export function loadMetaOverrides(): ItemMetaOverrides {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ItemMetaOverrides
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveMetaOverrides(meta: ItemMetaOverrides): void {
  localStorage.setItem(META_KEY, JSON.stringify(meta))
  notifyDataChanged()
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
  a.download = `shawarma-inventory-${new Date().toISOString().slice(0, 10)}.json`
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
