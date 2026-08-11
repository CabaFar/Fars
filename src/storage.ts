import type { AppData } from './types'
import { emptyAppData } from './types'

const STORAGE_KEY = 'shawarma-accounting-aug-2026-v1'

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyAppData()
    const parsed = JSON.parse(raw) as AppData
    return {
      wasita: parsed.wasita ?? emptyAppData().wasita,
      beirut: parsed.beirut ?? emptyAppData().beirut,
    }
  } catch {
    return emptyAppData()
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
