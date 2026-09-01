import type { Employee } from './types'
import { cloneForNewMonth, emptyEmployee, monthKey, normalizePaymentMethod } from './types'

const STORAGE_KEY = 'shawarma-hr-employees-v1'

export type HrStore = {
  version: 2
  months: Record<string, Employee[]>
}

function normalizeEmployee(row: Partial<Employee> & { id?: string }): Employee {
  return {
    ...emptyEmployee(),
    ...row,
    id: row.id || `emp-${Date.now()}`,
    name: row.name ?? '',
    jobTitle: row.jobTitle ?? '',
    salary: Number(row.salary) || 0,
    paymentMethod: normalizePaymentMethod(row.paymentMethod),
    deductions: Number(row.deductions) || 0,
    deductionNote: row.deductionNote ?? '',
    advances: Number(row.advances) || 0,
    iqamaExpiry: row.iqamaExpiry ?? '',
    healthCertExpiry: row.healthCertExpiry ?? '',
    medicalInsuranceExpiry: row.medicalInsuranceExpiry ?? '',
  }
}

function normalizeList(rows: unknown): Employee[] {
  if (!Array.isArray(rows)) return []
  return rows.map((row) => normalizeEmployee(row as Partial<Employee>))
}

function emptyStore(): HrStore {
  return { version: 2, months: {} }
}

export function loadStore(): HrStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as HrStore | Employee[]
    if (Array.isArray(parsed)) {
      const now = new Date()
      const key = monthKey(now.getFullYear(), now.getMonth())
      return { version: 2, months: { [key]: normalizeList(parsed) } }
    }
    if (parsed && typeof parsed === 'object' && parsed.months) {
      const months: Record<string, Employee[]> = {}
      for (const [key, list] of Object.entries(parsed.months)) {
        months[key] = normalizeList(list)
      }
      return { version: 2, months }
    }
    return emptyStore()
  } catch {
    return emptyStore()
  }
}

export function saveStore(store: HrStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function nearestSourceKey(store: HrStore, targetKey: string): string | null {
  const keys = Object.keys(store.months).sort()
  const prev = keys.filter((key) => key < targetKey).at(-1)
  if (prev) return prev
  const next = keys.find((key) => key > targetKey)
  return next ?? null
}

export function employeesForMonth(store: HrStore, key: string): Employee[] {
  return store.months[key] ?? []
}

export function ensureMonth(store: HrStore, key: string): HrStore {
  if (store.months[key]) return store
  const sourceKey = nearestSourceKey(store, key)
  const source = sourceKey ? store.months[sourceKey] : []
  const cloned = sourceKey && sourceKey < key ? cloneForNewMonth(source) : source.map((emp) => ({ ...emp }))
  return {
    ...store,
    months: { ...store.months, [key]: cloned },
  }
}

export function setMonthEmployees(store: HrStore, key: string, employees: Employee[]): HrStore {
  return {
    ...store,
    months: { ...store.months, [key]: employees },
  }
}
