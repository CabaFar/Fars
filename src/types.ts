export type BranchId = 'wasita' | 'beirut'

export const BRANCHES: { id: BranchId; name: string }[] = [
  { id: 'wasita', name: 'فرع الوسيطاء' },
  { id: 'beirut', name: 'فرع بيروت' },
]

export const DEVICE_FIELD = { key: 'device', label: 'الجهاز' } as const

export const DETAIL_FIELDS = [
  { key: 'cash', label: 'الكاش' },
  { key: 'exchange1', label: 'صرافة 1' },
  { key: 'visa1', label: 'فيزا 1' },
  { key: 'hala', label: 'هلا' },
] as const

export const EXTRA_SALES_FIELDS = [
  { key: 'todayPurchases', label: 'المشتريات' },
  { key: 'deliveryApps', label: 'التطبيقات' },
] as const

export type SalesDay = {
  device: number
  cash: number
  exchange1: number
  visa1: number
  hala: number
  todayPurchases: number
  deliveryApps: number
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
    device: 0,
    cash: 0,
    exchange1: 0,
    visa1: 0,
    hala: 0,
    todayPurchases: 0,
    deliveryApps: 0,
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
    device: n('device'),
    cash: n('cash'),
    exchange1: n('exchange1') || n('rajhi'),
    visa1: n('visa1') || n('riyadh'),
    hala: n('hala'),
    todayPurchases: n('todayPurchases'),
    deliveryApps: n('deliveryApps'),
  }
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

/** الكاش + صرافة 1 + فيزا 1 + هلا */
export function tillTotal(day: SalesDay | undefined): number {
  const s = normalizeSalesDay(day)
  return roundMoney(s.cash + s.exchange1 + s.visa1 + s.hala)
}

/** المبيعات داخل المحل = الكاش + صرافة 1 + فيزا 1 + هلا − المشتريات */
export function inStoreSales(day: SalesDay | undefined): number {
  const s = normalizeSalesDay(day)
  return roundMoney(tillTotal(s) - s.todayPurchases)
}

/** إجمالي المبيعات مع التطبيقات = المبيعات داخل المحل + التطبيقات */
export function totalWithApps(day: SalesDay | undefined): number {
  const s = normalizeSalesDay(day)
  return roundMoney(inStoreSales(s) + s.deliveryApps)
}

/** فائض أو عجز = إجمالي المبيعات مع التطبيقات − الجهاز */
export function surplusDeficit(day: SalesDay | undefined): number {
  const s = normalizeSalesDay(day)
  return roundMoney(totalWithApps(s) - s.device)
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function dateKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`
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

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export function sumSalesDay(day: SalesDay | undefined): number {
  return totalWithApps(day)
}

export function sumExpenseDay(day: ExpenseDay | undefined): number {
  if (!day) return 0
  return EXPENSE_FIELDS.reduce((acc, f) => acc + (day[f.key] || 0), 0)
}

export function calcBranchTotals(data: BranchData, year: number, month: number) {
  const days = daysInMonth(year, month)
  let totalExpenses = 0
  let totalDevice = 0
  let totalInStore = 0
  let totalApps = 0
  let totalPurchases = 0

  for (let d = 1; d <= days; d++) {
    const key = dateKey(year, month, d)
    const sales = data.sales[key]
    const expenses = data.expenses[key]
    const day = normalizeSalesDay(sales)
    totalDevice += day.device
    totalInStore += inStoreSales(day)
    totalApps += day.deliveryApps
    totalPurchases += day.todayPurchases
    totalExpenses += sumExpenseDay(expenses)
  }

  const totalSales = roundMoney(totalInStore + totalApps)
  const variance = roundMoney(totalSales - totalDevice)

  return {
    totalSales,
    totalDevice,
    totalInStore,
    totalApps,
    totalPurchases,
    variance,
    totalExpenses,
    netProfit: roundMoney(totalSales - totalExpenses),
  }
}
