import type { InventoryData } from './types'
import { emptyInventoryData } from './types'

const STORAGE_KEY = 'shawarma-inventory-v1'

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

export function exportInventory(data: InventoryData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `shawarma-inventory-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importInventory(file: File): Promise<InventoryData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as InventoryData
        resolve({
          wasita: parsed.wasita ?? {},
          beirut: parsed.beirut ?? {},
        })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
