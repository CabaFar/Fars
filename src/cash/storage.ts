import type { CashAppData } from './types'
import { emptyCashAppData, normalizeCashDay } from './types'

/** مفتاح تخزين مستقل لكل الأشهر — يحفظ بيانات أغسطس السابقة أيضاً */
const STORAGE_KEY = 'daily-cash-ledger-aug-2026-v1'

export function loadCashData(): CashAppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyCashAppData()
    const parsed = JSON.parse(raw) as CashAppData
    const normalizeBranch = (branch: CashAppData[keyof CashAppData] | undefined) => {
      const out: CashAppData['wasita'] = {}
      for (const [key, day] of Object.entries(branch ?? {})) {
        out[key] = normalizeCashDay(day)
      }
      return out
    }
    return {
      wasita: normalizeBranch(parsed.wasita),
      beirut: normalizeBranch(parsed.beirut),
    }
  } catch {
    return emptyCashAppData()
  }
}

export function saveCashData(data: CashAppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
