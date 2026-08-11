import type { CashAppData } from './types'
import { emptyCashAppData } from './types'

/** مفتاح تخزين مستقل — لا يرتبط بمحاسبة أغسطس */
const STORAGE_KEY = 'daily-cash-ledger-aug-2026-v1'

export function loadCashData(): CashAppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyCashAppData()
    const parsed = JSON.parse(raw) as CashAppData
    return {
      wasita: parsed.wasita ?? {},
      beirut: parsed.beirut ?? {},
    }
  } catch {
    return emptyCashAppData()
  }
}

export function saveCashData(data: CashAppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
