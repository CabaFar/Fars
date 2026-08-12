import type { InventoryData, PriceList } from './types'
import { emptyInventoryData, emptyPriceList } from './types'

const STORAGE_KEY = 'shawarma-inventory-v1'
const PRICE_KEY = 'shawarma-inventory-prices-v1'

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
}

export function exportInventory(data: InventoryData, prices: PriceList): void {
  const blob = new Blob([JSON.stringify({ version: 2, data, prices }, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `shawarma-inventory-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importInventory(file: File): Promise<{ data: InventoryData; prices: PriceList }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as {
          version?: number
          data?: InventoryData
          prices?: PriceList
          wasita?: InventoryData['wasita']
          beirut?: InventoryData['beirut']
        }
        if (parsed.data) {
          resolve({
            data: {
              wasita: parsed.data.wasita ?? {},
              beirut: parsed.data.beirut ?? {},
            },
            prices: {
              wasita: parsed.prices?.wasita ?? {},
              beirut: parsed.prices?.beirut ?? {},
            },
          })
          return
        }
        resolve({
          data: {
            wasita: parsed.wasita ?? {},
            beirut: parsed.beirut ?? {},
          },
          prices: emptyPriceList(),
        })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
