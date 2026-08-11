export type BranchId = 'wasita' | 'beirut'

export const BRANCHES: { id: BranchId; name: string }[] = [
  { id: 'wasita', name: 'فرع الوسيطاء' },
  { id: 'beirut', name: 'فرع بيروت' },
]

export const YEAR = 2026
export const MONTH = 7 // August (0-indexed)

export const SALES_FIELDS = [
  { key: 'device', label: 'الجهاز' },
  { key: 'exchange1', label: 'صرافه 1' },
  { key: 'visa1', label: 'Visa 1' },
  { key: 'hala', label: 'هلا' },
  { key: 'todayPurchases', label: 'مشتريات اليوم' },
  { key: 'cash', label: 'الكاش النقدي' },
  { key: 'deliveryApps', label: 'تطبيقات التوصيل' },
  { key: 'surplusDeficit', label: 'فائض أو عجز' },
] as const

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

export type SalesKey = (typeof SALES_FIELDS)[number]['key']
export type ExpenseKey = (typeof EXPENSE_FIELDS)[number]['key']

export type SalesDay = Record<SalesKey, number>
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
    exchange1: 0,
    visa1: 0,
    hala: 0,
    todayPurchases: 0,
    cash: 0,
    deliveryApps: 0,
    surplusDeficit: 0,
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

/** Revenue fields that count toward total sales (exclude اليوم purchases which is expense-like, and surplus/deficit which is adjustment) */
export const SALES_REVENUE_KEYS: SalesKey[] = [
  'device',
  'exchange1',
  'visa1',
  'hala',
  'cash',
  'deliveryApps',
]

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
  if (!day) return 0
  // إجمالي المبيعات = مصادر الدخل + فائض/عجز
  // مشتريات اليوم تُحسب ضمن المصروفات
  let total = 0
  for (const key of SALES_REVENUE_KEYS) {
    total += day[key] || 0
  }
  total += day.surplusDeficit || 0
  return total
}

export function sumExpenseDay(day: ExpenseDay | undefined): number {
  if (!day) return 0
  return EXPENSE_FIELDS.reduce((acc, f) => acc + (day[f.key] || 0), 0)
}

export function calcBranchTotals(data: BranchData) {
  const days = daysInMonth(YEAR, MONTH)
  let totalSales = 0
  let totalExpenses = 0

  for (let d = 1; d <= days; d++) {
    const key = dateKey(d)
    const sales = data.sales[key]
    const expenses = data.expenses[key]
    // المبيعات: مصادر الدخل + فائض/عجز (بدون مشتريات اليوم)
    totalSales += sumSalesDay(sales)
    // المصروفات: بنود المشتريات التفصيلية فقط
    // «مشتريات اليوم» في ورقة المبيعات للمطابقة مع الصندوق ولا تُضاعَف هنا
    totalExpenses += sumExpenseDay(expenses)
  }

  return {
    totalSales,
    totalExpenses,
    netProfit: totalSales - totalExpenses,
  }
}
