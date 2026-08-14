import type { CatalogItem, Unit } from './catalog'

export type BranchId = 'wasita' | 'beirut'

export const BRANCHES: { id: BranchId; name: string }[] = [
  { id: 'wasita', name: 'فرع الوسيطاء' },
  { id: 'beirut', name: 'فرع بيروت' },
]

export const ARABIC_DAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
]

export type ItemDay = {
  openingQty: number
  purchaseQty: number
  unitPrice: number
  purchaseCost: number
  supplier: string
  closingQty: number
  counted: boolean
}

export type DayRecord = Record<string, ItemDay>
export type BranchData = Record<string, DayRecord>
export type InventoryData = Record<BranchId, BranchData>
export type PriceList = Record<BranchId, Record<string, number>>
export type UnitOverrides = Record<string, Unit>

export function emptyItemDay(openingQty = 0): ItemDay {
  return {
    openingQty,
    purchaseQty: 0,
    unitPrice: 0,
    purchaseCost: 0,
    supplier: '',
    closingQty: 0,
    counted: false,
  }
}

export function emptyInventoryData(): InventoryData {
  return { wasita: {}, beirut: {} }
}

export function emptyPriceList(): PriceList {
  return { wasita: {}, beirut: {} }
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function lineTotal(qty: number, unitPrice: number): number {
  return roundMoney(qty * unitPrice)
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function dateKeyFromParts(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toDateKey(date: Date): string {
  return dateKeyFromParts(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatQty(value: number, unit: Unit): string {
  const n = Number.isFinite(value) ? value : 0
  const formatted = new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: unit === 'kg' ? 3 : 2,
  }).format(n)
  const labels: Record<Unit, string> = {
    kg: 'كيلو',
    piece: 'حبة',
    carton: 'كرتون',
    pack: 'شد',
    tank: 'تنك',
  }
  return `${formatted} ${labels[unit]}`
}

export function expectedQty(day: ItemDay): number {
  return roundQty(day.openingQty + day.purchaseQty)
}

export function consumedQty(day: ItemDay): number {
  if (!day.counted) return 0
  return roundQty(day.openingQty + day.purchaseQty - day.closingQty)
}

export function unitCost(day: ItemDay): number {
  if (day.unitPrice > 0) return day.unitPrice
  if (day.purchaseQty > 0 && day.purchaseCost > 0) {
    return day.purchaseCost / day.purchaseQty
  }
  return 0
}

export function lastUnitCost(
  data: InventoryData,
  branch: BranchId,
  currentKey: string,
  itemId: string,
): number {
  const start = parseDateKey(currentKey)
  for (let i = 0; i <= 90; i++) {
    const prevKey = toDateKey(addDays(start, -i))
    const rec = data[branch][prevKey]?.[itemId]
    if (rec && rec.unitPrice > 0) return rec.unitPrice
    if (rec && rec.purchaseQty > 0 && rec.purchaseCost > 0) {
      return rec.purchaseCost / rec.purchaseQty
    }
  }
  return 0
}

export function lastSupplier(
  data: InventoryData,
  branch: BranchId,
  currentKey: string,
  itemId: string,
): string {
  const start = parseDateKey(currentKey)
  for (let i = 0; i <= 90; i++) {
    const prevKey = toDateKey(addDays(start, -i))
    const rec = data[branch][prevKey]?.[itemId]
    if (rec?.supplier) return rec.supplier
  }
  return ''
}

export function consumedCost(_item: CatalogItem, day: ItemDay, fallbackUnitCost = 0): number {
  const used = consumedQty(day)
  if (used <= 0) return 0
  const cost = unitCost(day) || fallbackUnitCost
  if (cost > 0) return used * cost
  return 0
}

export function roundQty(value: number): number {
  return Math.round(value * 1000) / 1000
}

export function lastCountedClosing(
  data: InventoryData,
  branch: BranchId,
  currentKey: string,
  itemId: string,
): number {
  const start = parseDateKey(currentKey)
  for (let i = 1; i <= 90; i++) {
    const prevKey = toDateKey(addDays(start, -i))
    const rec = data[branch][prevKey]?.[itemId]
    if (rec?.counted) return rec.closingQty
  }
  return 0
}

export function resolveItemDay(
  data: InventoryData,
  branch: BranchId,
  key: string,
  itemId: string,
): ItemDay {
  const existing = data[branch][key]?.[itemId]
  if (existing) {
    const unitPrice =
      existing.unitPrice ||
      (existing.purchaseQty > 0 && existing.purchaseCost > 0
        ? existing.purchaseCost / existing.purchaseQty
        : 0)
    return {
      ...emptyItemDay(),
      ...existing,
      unitPrice,
      supplier: existing.supplier ?? '',
    }
  }
  return emptyItemDay(lastCountedClosing(data, branch, key, itemId))
}

export function dayHasActivity(record: DayRecord | undefined): boolean {
  if (!record) return false
  return Object.values(record).some(
    (item) =>
      item.counted ||
      item.purchaseQty !== 0 ||
      item.purchaseCost !== 0 ||
      item.openingQty !== 0 ||
      Boolean(item.supplier),
  )
}

export function parseNum(raw: string): number {
  const n = Number(raw.replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}
