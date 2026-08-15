export type SalaryPaymentMethod = 'cash' | 'transfer'

export type Employee = {
  id: string
  name: string
  jobTitle: string
  salary: number
  /** طريقة صرف الراتب: كاش أو تحويل */
  paymentMethod: SalaryPaymentMethod
  deductions: number
  /** ملاحظة توضح سبب الخصم */
  deductionNote: string
  advances: number
  iqamaExpiry: string
  healthCertExpiry: string
  medicalInsuranceExpiry: string
}

export type ExpiryTone = 'ok' | 'warn' | 'urgent' | 'expired' | 'empty'

export type ExpiryInfo = {
  daysLeft: number | null
  tone: ExpiryTone
  label: string
}

export function emptyEmployee(): Omit<Employee, 'id'> {
  return {
    name: '',
    jobTitle: '',
    salary: 0,
    paymentMethod: 'cash',
    deductions: 0,
    deductionNote: '',
    advances: 0,
    iqamaExpiry: '',
    healthCertExpiry: '',
    medicalInsuranceExpiry: '',
  }
}

export const PAYMENT_METHODS: { id: SalaryPaymentMethod; label: string }[] = [
  { id: 'cash', label: 'كاش' },
  { id: 'transfer', label: 'تحويل' },
]

export function paymentMethodLabel(method: SalaryPaymentMethod | undefined): string {
  return PAYMENT_METHODS.find((row) => row.id === method)?.label ?? 'كاش'
}

export function normalizePaymentMethod(value: unknown): SalaryPaymentMethod {
  return value === 'transfer' ? 'transfer' : 'cash'
}

export function netSalary(employee: Pick<Employee, 'salary' | 'deductions' | 'advances'>): number {
  return Math.round((employee.salary - employee.deductions - employee.advances) * 100) / 100
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export function parseNum(raw: string): number {
  const n = Number(raw.replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

function startOfToday(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function parseDateOnly(value: string): Date | null {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function daysUntil(dateValue: string): number | null {
  const target = parseDateOnly(dateValue)
  if (!target) return null
  const today = startOfToday()
  const diff = target.getTime() - today.getTime()
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

export function expiryInfo(dateValue: string): ExpiryInfo {
  const daysLeft = daysUntil(dateValue)
  if (daysLeft === null) {
    return { daysLeft: null, tone: 'empty', label: 'غير محدد' }
  }
  if (daysLeft < 0) {
    return {
      daysLeft,
      tone: 'expired',
      label: `منتهي منذ ${Math.abs(daysLeft)} يوم`,
    }
  }
  if (daysLeft < 30) {
    return { daysLeft, tone: 'urgent', label: `${daysLeft} يوم` }
  }
  if (daysLeft < 60) {
    return { daysLeft, tone: 'warn', label: `${daysLeft} يوم` }
  }
  return { daysLeft, tone: 'ok', label: `${daysLeft} يوم` }
}

export function formatDateAr(value: string): string {
  const date = parseDateOnly(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export const DOC_FIELDS = [
  { key: 'iqamaExpiry', label: 'انتهاء الإقامة' },
  { key: 'healthCertExpiry', label: 'انتهاء الشهادة الصحية' },
  { key: 'medicalInsuranceExpiry', label: 'انتهاء التأمين الطبي' },
] as const

export type DocKey = (typeof DOC_FIELDS)[number]['key']
