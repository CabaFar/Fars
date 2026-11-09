export type BrandId = 'fars' | 'street'

export type Brand = {
  id: BrandId
  name: string
  backupFile: string
  titles: {
    accounting: string
    cash: string
    inventory: string
    hr: string
  }
}

const FARS: Brand = {
  id: 'fars',
  name: 'شاورما',
  backupFile: 'shawarma-backup',
  titles: {
    accounting: 'محاسبة شاورما',
    cash: 'سجل الكاش اليومي',
    inventory: 'مخزون شاورما',
    hr: 'الموارد البشرية — شاورما',
  },
}

const STREET: Brand = {
  id: 'street',
  name: 'مطعم شارع الشاورما',
  backupFile: 'shawarma-street-backup',
  titles: {
    accounting: 'مطعم شارع الشاورما — المحاسبة',
    cash: 'مطعم شارع الشاورما — الكاش',
    inventory: 'مخزون مطعم شارع الشاورما',
    hr: 'الموارد البشرية — مطعم شارع الشاورما',
  },
}

export function getBrandId(): BrandId {
  if (typeof window === 'undefined') return 'fars'
  return window.location.pathname.includes('/street') ? 'street' : 'fars'
}

export function getBrand(): Brand {
  return getBrandId() === 'street' ? STREET : FARS
}

export function storageKey(base: string): string {
  return getBrandId() === 'street' ? `street-${base}` : base
}

export function applyBrand(): void {
  const brand = getBrand()
  document.documentElement.dataset.brand = brand.id
  const path = window.location.pathname
  let page: keyof Brand['titles'] = 'accounting'
  if (path.includes('cash')) page = 'cash'
  else if (path.includes('inventory')) page = 'inventory'
  else if (path.includes('hr')) page = 'hr'
  document.title = brand.titles[page]
}
