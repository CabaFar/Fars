import { storageKey } from './brand'
import { notifyLocalChange } from './notifyChange'
import type { AppData, BranchId, ExtraExpense, SalesDay } from './types'
import { emptyAppData, emptyBranch, normalizeSalesDay } from './types'

/** نفس المفتاح السابق حتى تبقى بيانات أغسطس ٢٠٢٦ عند التنقل بين الشهور */
const STORAGE_KEY = 'shawarma-accounting-aug-2026-v1'
export function accountingStorageKey() {
  return storageKey(STORAGE_KEY)
}

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

function normalizeExtraExpenses(raw: unknown): ExtraExpense[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const rec = item as { id?: unknown; label?: unknown }
      const id = typeof rec.id === 'string' ? rec.id.trim() : ''
      const label = typeof rec.label === 'string' ? rec.label.trim() : ''
      if (!id || !label) return null
      return { id, label }
    })
    .filter((item): item is ExtraExpense => Boolean(item))
}

function normalizeExpenseLabels(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim()) out[key] = value.trim()
  }
  return out
}

function normalizeHiddenExpenseKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter((key): key is string => typeof key === 'string' && key.trim() !== ''))]
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(accountingStorageKey())
    if (!raw) return emptyAppData()
    const parsed = JSON.parse(raw) as Partial<AppData>
    return {
      wasita: normalizeBranch(parsed.wasita),
      beirut: normalizeBranch(parsed.beirut),
      extraExpenses: normalizeExtraExpenses(parsed.extraExpenses),
      expenseLabels: normalizeExpenseLabels(parsed.expenseLabels),
      hiddenExpenseKeys: normalizeHiddenExpenseKeys(parsed.hiddenExpenseKeys),
    }
  } catch {
    return emptyAppData()
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(accountingStorageKey(), JSON.stringify(data))
  notifyLocalChange()
}
