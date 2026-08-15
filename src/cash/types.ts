export type BranchId = 'wasita' | 'beirut'

export const BRANCHES: { id: BranchId; name: string }[] = [
  { id: 'wasita', name: 'فرع الوسيطاء' },
  { id: 'beirut', name: 'فرع بيروت' },
]

export type CashDay = {
  cash: number
  cashExpense: number
  /** ملاحظات: فيما صُرفت مصروفات الكاش */
  expenseNote: string
}

export type CashBranchData = Record<string, CashDay>
export type CashAppData = Record<BranchId, CashBranchData>

export const ARABIC_DAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
]

export function emptyCashDay(): CashDay {
  return { cash: 0, cashExpense: 0, expenseNote: '' }
}

export function emptyCashAppData(): CashAppData {
  return { wasita: {}, beirut: {} }
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function dateKeyFromParts(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export type CashMoneyField = 'cash' | 'cashExpense'

export function sumField(
  data: CashBranchData,
  field: CashMoneyField,
  year: number,
  month: number,
): number {
  const days = daysInMonth(year, month)
  let total = 0
  for (let d = 1; d <= days; d++) {
    total += data[dateKeyFromParts(year, month, d)]?.[field] || 0
  }
  return total
}

/** تطبيع يوم قديم محفوظ قبل إضافة خانة الملاحظات */
export function normalizeCashDay(day: Partial<CashDay> | undefined): CashDay {
  return {
    cash: day?.cash || 0,
    cashExpense: day?.cashExpense || 0,
    expenseNote: day?.expenseNote ?? '',
  }
}
