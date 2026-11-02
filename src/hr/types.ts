export type SalaryPaymentMethod = 'cash' | 'transfer'

export type AdvancePlan = {
  id: string
  amount: number
  months: number
  startKey: string
  note: string
}

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
  /** قسط السلفة لهذا الشهر (يُحسب من الخطط أو القيمة القديمة) */
  advances: number
  advancePlans: AdvancePlan[]
  /** 0 = الشهر كامل */
  daysWorked: number
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
    advancePlans: [],
    daysWorked: 0,
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

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function monthToIndex(key: string): number {
  const [year, month] = key.split('-').map(Number)
  if (!year || !month) return 0
  return year * 12 + (month - 1)
}

export function normalizeAdvancePlan(raw: Partial<AdvancePlan> | undefined, fallbackKey: string): AdvancePlan | null {
  if (!raw) return null
  const amount = Number(raw.amount) || 0
  const months = Math.max(1, Math.round(Number(raw.months) || 1))
  if (amount <= 0) return null
  return {
    id: raw.id || `adv-${Date.now()}`,
    amount,
    months,
    startKey: raw.startKey || fallbackKey,
    note: raw.note ?? '',
  }
}

export function planInstallment(plan: AdvancePlan, currentKey: string): number {
  const elapsed = monthToIndex(currentKey) - monthToIndex(plan.startKey)
  if (elapsed < 0 || elapsed >= plan.months) return 0
  return roundMoney(plan.amount / plan.months)
}

export function planRemaining(plan: AdvancePlan, currentKey: string): number {
  const elapsed = monthToIndex(currentKey) - monthToIndex(plan.startKey)
  if (elapsed < 0) return plan.amount
  if (elapsed >= plan.months) return 0
  return roundMoney(plan.amount - elapsed * (plan.amount / plan.months))
}

export function activeAdvancePlans(employee: Pick<Employee, 'advancePlans'>, currentKey: string): AdvancePlan[] {
  return (employee.advancePlans ?? []).filter((plan) => planRemaining(plan, currentKey) > 0)
}

export function monthAdvances(
  employee: Pick<Employee, 'advances' | 'advancePlans'>,
  currentKey: string,
): number {
  const plans = employee.advancePlans ?? []
  if (plans.length === 0) return Number(employee.advances) || 0
  return roundMoney(plans.reduce((sum, plan) => sum + planInstallment(plan, currentKey), 0))
}

export function remainingAdvances(
  employee: Pick<Employee, 'advancePlans' | 'advances'>,
  currentKey: string,
): number {
  const plans = employee.advancePlans ?? []
  if (plans.length === 0) return Number(employee.advances) || 0
  return roundMoney(plans.reduce((sum, plan) => sum + planRemaining(plan, currentKey), 0))
}

export function earnedSalary(
  employee: Pick<Employee, 'salary' | 'daysWorked'>,
  year: number,
  month: number,
): number {
  const days = daysInMonth(year, month)
  const worked = employee.daysWorked > 0 ? Math.min(employee.daysWorked, days) : days
  if (days <= 0) return 0
  return roundMoney((employee.salary || 0) * (worked / days))
}

export function netSalary(
  employee: Pick<Employee, 'salary' | 'deductions' | 'advances' | 'advancePlans' | 'daysWorked'>,
  year: number,
  month: number,
  currentKey: string,
): number {
  return roundMoney(
    earnedSalary(employee, year, month) - (employee.deductions || 0) - monthAdvances(employee, currentKey),
  )
}

export function grossSalaryTotal(employees: Pick<Employee, 'salary'>[]): number {
  return employees.reduce((sum, emp) => sum + (emp.salary || 0), 0)
}

export function earnedSalaryTotal(
  employees: Pick<Employee, 'salary' | 'daysWorked'>[],
  year: number,
  month: number,
): number {
  return employees.reduce((sum, emp) => sum + earnedSalary(emp, year, month), 0)
}

export function deductionsTotal(employees: Pick<Employee, 'deductions'>[]): number {
  return employees.reduce((sum, emp) => sum + (emp.deductions || 0), 0)
}

export function advancesTotal(
  employees: Pick<Employee, 'advances' | 'advancePlans'>[],
  currentKey: string,
): number {
  return employees.reduce((sum, emp) => sum + monthAdvances(emp, currentKey), 0)
}

export function netSalaryTotal(
  employees: Pick<Employee, 'salary' | 'deductions' | 'advances' | 'advancePlans' | 'daysWorked'>[],
  year: number,
  month: number,
  currentKey: string,
): number {
  return employees.reduce((sum, emp) => sum + netSalary(emp, year, month, currentKey), 0)
}

export function byPaymentMethod(
  employees: Employee[],
  method: SalaryPaymentMethod,
): Employee[] {
  return employees.filter((emp) => (emp.paymentMethod ?? 'cash') === method)
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function monthKey(year: number, month: number): string {
  return `${year}-${pad2(month + 1)}`
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const next = new Date(year, month + delta, 1)
  return { year: next.getFullYear(), month: next.getMonth() }
}

export function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('ar-SA', { month: 'long', year: 'numeric' }).format(
    new Date(year, month, 1),
  )
}

export function cloneForNewMonth(employees: Employee[], nextKey: string): Employee[] {
  return employees.map((emp) => ({
    ...emp,
    deductions: 0,
    deductionNote: '',
    daysWorked: 0,
    advancePlans: emp.advancePlans ?? [],
    advances: monthAdvances({ ...emp, advances: 0 }, nextKey),
  }))
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
