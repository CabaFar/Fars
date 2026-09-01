export type BranchId = 'wasita' | 'beirut'

export const BRANCHES: { id: BranchId; name: string }[] = [
  { id: 'wasita', name: 'فرع الوسيطاء' },
  { id: 'beirut', name: 'فرع بيروت' },
]

export const YEAR = 2026
export const MONTH = 7 // August (0-indexed)

export const CASH_FIELD = { key: 'cash', label: 'الكاش' } as const

export const CARD_FIELDS = [
  { key: 'riyadh', label: 'الرياض' },
  { key: 'rajhi', label: 'الراجحي' },
  { key: 'hala', label: 'هلا' },
] as const

export const RECORDED_SALES_FIELDS = [
  { key: 'device', label: 'مبيعات داخل المحل' },
  { key: 'deliveryApps', label: 'مبيعات التطبيقات' },
] as const

export type SalesDay = {
  cash: number
  riyadh: number
  rajhi: number
  hala: number
  device: number
  deliveryApps: number
  todayPurchases: number
}

export type SalesKey = keyof SalesDay

export const EXPENSE_FIELDS = [
  { key: 'chicken', label: 'الدجاج (البركة)' },
  { key: 'pepsi', label: 'بيبسي' },
  { key: 'gas', label: 'الغاز' },
  { key: 'potato', label: 'البطاطس' },
  { key: 'fridge1', label: 'الثلاجة (حصن الأغذية)' },
  { key: 'fridge2', label: 'ثلاجة 2' },
  { key: 'abuBandar', label: 'مشتريات أبو بندر' },
  { key: 'wellWater', label: 'مياه آبار' },
  { key: 'vegetables', label: 'خضار (جنى الرمان)' },
  { key: 'samuli', label: 'صامولي طيبة' },
  { key: 'plastic', label: 'بلاستيك ومنظفات' },
  { key: 'salaries', label: 'رواتب' },
  { key: 'electricity', label: 'كهرباء' },
  { key: 'housing', label: 'إيجار سكن عمال' },
] as const

export type ExpenseKey = (typeof EXPENSE_FIELDS)[number]['key']
export type ExpenseDay = Record<ExpenseKey, number>

export type BranchData = {
  sales: Record<string, SalesDay>
  expenses: Record<string, ExpenseDay>
}

export type AppData = Record<BranchId, BranchData>

export const ARABIC_DAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
]

export function emptySales(): SalesDay {
  return {
    cash: 0,
    riyadh: 0,
    rajhi: 0,
    hala: 0,
    device: 0,
    deliveryApps: 0,
    todayPurchases: 0,
  }
}

export function emptyExpenses(): ExpenseDay {
  return {
    chicken: 0,
    pepsi: 0,
    gas: 0,
    potato: 0,
    fridge1: 0,
    fridge2: 0,
    abuBandar: 0,
    wellWater: 0,
    vegetables: 0,
    samuli: 0,
    plastic: 0,
    salaries: 0,
    electricity: 0,
    housing: 0,
  }
}

export function emptyBranch(): BranchData {
  return { sales: {}, expenses: {} }
}

export function emptyAppData(): AppData {
  return {
    wasita: emptyBranch(),
    beirut: emptyBranch(),
  }
}

export function normalizeSalesDay(raw: unknown): SalesDay {
  if (!raw || typeof raw !== 'object') return emptySales()
  const rec = raw as Record<string, unknown>
  const n = (key: string) => {
    const value = Number(rec[key])
    return Number.isFinite(value) ? value : 0
  }
  return {
    cash: n('cash'),
    riyadh: n('riyadh') || n('visa1'),
    rajhi: n('rajhi'),
    hala: n('hala'),
    device: n('device'),
    deliveryApps: n('deliveryApps'),
    todayPurchases: n('todayPurchases'),
  }
}

export function cardsTotal(day: SalesDay | undefined): number {
  const s = normalizeSalesDay(day)
  return s.riyadh + s.rajhi + s.hala
}

/** الإجمالي = الكاش + البطاقات */
export function collectionTotal(day: SalesDay | undefined): number {
  const s = normalizeSalesDay(day)
  return s.cash + cardsTotal(s)
}

/** مبيعات داخل المحل + مبيعات التطبيقات */
export function recordedSalesTotal(day: SalesDay | undefined): number {
  const s = normalizeSalesDay(day)
  return s.device + s.deliveryApps
}

/** فائض إن كان موجباً، وعجز إن كان سالباً: (كاش + بطاقات) − (داخل المحل + التطبيقات) */
export function surplusDeficit(day: SalesDay | undefined): number {
  return Math.round((collectionTotal(day) - recordedSalesTotal(day)) * 100) / 100
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

export function sumSalesDay(day: SalesDay | undefined): number {
  return collectionTotal(day)
}

export function sumExpenseDay(day: ExpenseDay | undefined): number {
  if (!day) return 0
  return EXPENSE_FIELDS.reduce((acc, f) => acc + (day[f.key] || 0), 0)
}

export function calcBranchTotals(data: BranchData) {
  const days = daysInMonth(YEAR, MONTH)
  let totalSales = 0
  let totalExpenses = 0
  let totalCash = 0
  let totalCards = 0
  let totalRecorded = 0

  for (let d = 1; d <= days; d++) {
    const key = dateKey(d)
    const sales = data.sales[key]
    const expenses = data.expenses[key]
    const day = normalizeSalesDay(sales)
    totalCash += day.cash
    totalCards += cardsTotal(day)
    // المبيعات: الكاش + البطاقات
    totalSales += sumSalesDay(day)
    totalRecorded += recordedSalesTotal(day)
    // المصروفات: بنود المشتريات التفصيلية فقط
    // «مشتريات اليوم» في ورقة المبيعات للمطابقة مع الصندوق ولا تُضاعَف هنا
    totalExpenses += sumExpenseDay(expenses)
  }

  const variance = Math.round((totalSales - totalRecorded) * 100) / 100

  return {
    totalSales,
    totalCash,
    totalCards,
    totalRecorded,
    variance,
    totalExpenses,
    netProfit: totalSales - totalExpenses,
  }
}
