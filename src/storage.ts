import type { AppData, BranchId, SalesDay } from './types'
import { emptyAppData, emptyBranch, normalizeSalesDay } from './types'

const STORAGE_KEY = 'shawarma-accounting-aug-2026-v1'

function normalizeBranch(raw: AppData[BranchId] | undefined) {
  const base = emptyBranch()
  if (!raw) return base
  const sales: Record<string, SalesDay> = {}
  for (const [key, day] of Object.entries(raw.sales ?? {})) {
    sales[key] = normalizeSalesDay(day)
  }
  return {
    sales,
    expenses: raw.expenses ?? {},
  }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyAppData()
    const parsed = JSON.parse(raw) as AppData
    return {
      wasita: normalizeBranch(parsed.wasita),
      beirut: normalizeBranch(parsed.beirut),
    }
  } catch {
    return emptyAppData()
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
