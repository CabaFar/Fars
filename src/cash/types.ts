export type BranchId = 'wasita' | 'beirut'

export const BRANCHES: { id: BranchId; name: string }[] = [
  { id: 'wasita', name: 'فرع الوسيطاء' },
  { id: 'beirut', name: 'فرع بيروت' },
]

/** شهر أغسطس — صفحة الكاش مستقلة عن محاسبة المطعم */
export const YEAR = 2026
export const MONTH = 7 // August (0-indexed)

export type CashDay = {
  cash: number
  cashExpense: number
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
  return { cash: 0, cashExpense: 0 }
}

export function emptyCashAppData(): CashAppData {
  return { wasita: {}, beirut: {} }
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function dateKey(day: number): string {
  return `${YEAR}-${String(MONTH + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export function sumField(data: CashBranchData, field: keyof CashDay): number {
  const days = daysInMonth(YEAR, MONTH)
  let total = 0
  for (let d = 1; d <= days; d++) {
    total += data[dateKey(d)]?.[field] || 0
  }
  return total
}
