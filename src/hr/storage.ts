import type { Employee } from './types'
import { emptyEmployee } from './types'

const STORAGE_KEY = 'shawarma-hr-employees-v1'

export function loadEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Employee[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((row) => ({
      ...emptyEmployee(),
      ...row,
      id: row.id || `emp-${Date.now()}`,
      name: row.name ?? '',
      jobTitle: row.jobTitle ?? '',
      salary: Number(row.salary) || 0,
      deductions: Number(row.deductions) || 0,
      advances: Number(row.advances) || 0,
      iqamaExpiry: row.iqamaExpiry ?? '',
      healthCertExpiry: row.healthCertExpiry ?? '',
      medicalInsuranceExpiry: row.medicalInsuranceExpiry ?? '',
    }))
  } catch {
    return []
  }
}

export function saveEmployees(employees: Employee[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(employees))
}
