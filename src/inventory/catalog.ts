export type Unit = 'piece' | 'kg' | 'carton' | 'pack'

export type CategoryId =
  | 'chicken'
  | 'spices'
  | 'veg'
  | 'dry'
  | 'frozen'
  | 'sauces'
  | 'bakery'
  | 'plastic'

export type CountCycle = 'daily' | 'weekly'

export type CatalogItem = {
  id: string
  name: string
  category: CategoryId
  unit: Unit
  minStock: number
  step: number
  countCycle: CountCycle
  custom?: boolean
}

export type ExtraItem = {
  id: string
  name: string
  category: CategoryId
  unit: Unit
}

export const CATEGORIES: { id: CategoryId; name: string }[] = [
  { id: 'chicken', name: 'الدجاج' },
  { id: 'spices', name: 'البهارات' },
  { id: 'veg', name: 'الخضار' },
  { id: 'dry', name: 'جاف وسوائل' },
  { id: 'frozen', name: 'المجمدات' },
  { id: 'sauces', name: 'الصوصات' },
  { id: 'bakery', name: 'المخبوزات والطحين' },
  { id: 'plastic', name: 'بلاستيك وتغليف' },
]

export const UNITS: { id: Unit; name: string }[] = [
  { id: 'piece', name: 'حبة' },
  { id: 'kg', name: 'كيلو' },
  { id: 'carton', name: 'كرتون' },
  { id: 'pack', name: 'شد' },
]

export const UNIT_LABEL: Record<Unit, string> = {
  piece: 'حبة',
  kg: 'كيلو',
  carton: 'كرتون',
  pack: 'شد',
}

export function stepForUnit(unit: Unit): number {
  return unit === 'kg' ? 0.05 : 1
}

export function priceLabel(unit: Unit): string {
  return `سعر ال${UNIT_LABEL[unit]}`
}

function item(
  id: string,
  name: string,
  category: CategoryId,
  unit: Unit,
  minStock: number,
  countCycle: CountCycle,
): CatalogItem {
  return { id, name, category, unit, minStock, step: stepForUnit(unit), countCycle }
}

export const CATALOG: CatalogItem[] = [
  item('chicken', 'دجاج', 'chicken', 'kg', 8, 'daily'),
  item('spices', 'بهارات', 'spices', 'kg', 1, 'daily'),

  item('lettuce', 'خس', 'veg', 'kg', 1, 'daily'),
  item('hot-pepper', 'فلفل حار', 'veg', 'kg', 1, 'daily'),
  item('mild-pepper', 'فلفل بارد', 'veg', 'kg', 1, 'daily'),
  item('red-hot-pepper', 'فلفل حار أحمر', 'veg', 'kg', 1, 'daily'),
  item('tomato', 'طماط', 'veg', 'kg', 1, 'daily'),
  item('parsley', 'بقدونس', 'veg', 'kg', 1, 'daily'),
  item('cucumber', 'خيار', 'veg', 'kg', 1, 'daily'),
  item('garlic', 'ثوم', 'veg', 'kg', 1, 'daily'),
  item('orange', 'برتقال', 'veg', 'kg', 1, 'daily'),
  item('lemon', 'ليمون', 'veg', 'kg', 1, 'daily'),
  item('fresh-potato', 'بطاطس طازج', 'veg', 'kg', 1, 'daily'),

  item('salt', 'ملح', 'dry', 'carton', 1, 'weekly'),
  item('sugar', 'سكر', 'dry', 'carton', 1, 'weekly'),
  item('zahreti-oil', 'زيت زهرتي', 'dry', 'carton', 1, 'weekly'),
  item('dalal-oil', 'زيت دلال', 'dry', 'carton', 1, 'weekly'),
  item('eggs', 'بيض', 'dry', 'carton', 1, 'weekly'),
  item('food-color', 'ملون طعام', 'dry', 'carton', 1, 'weekly'),
  item('lemon-salt', 'ملح ليمون', 'dry', 'pack', 1, 'weekly'),
  item('burghul', 'برغل', 'dry', 'pack', 1, 'weekly'),

  item('frozen-potato', 'بطاطس مجمد', 'frozen', 'carton', 2, 'weekly'),
  item('chicken-burger', 'برغر دجاج', 'frozen', 'carton', 1, 'weekly'),
  item('akkawi', 'جبن عكاوي', 'frozen', 'carton', 1, 'weekly'),
  item('mozzarella', 'موزاريلا', 'frozen', 'carton', 1, 'weekly'),
  item('sliced-cheese', 'جبن شرائح', 'frozen', 'carton', 1, 'weekly'),

  item('pepper-paste', 'معجون فلفل', 'sauces', 'pack', 2, 'weekly'),
  item('tomato-paste', 'معجون طماط', 'sauces', 'pack', 2, 'weekly'),
  item('ketchup', 'كاتشب', 'sauces', 'carton', 1, 'weekly'),
  item('vinegar', 'خل', 'sauces', 'pack', 1, 'weekly'),
  item('shatta', 'شطة', 'sauces', 'carton', 1, 'weekly'),
  item('tahini', 'طحينة', 'sauces', 'carton', 1, 'weekly'),
  item('pomegranate', 'دبس رمان', 'sauces', 'carton', 1, 'weekly'),
  item('pickles', 'مخلل', 'sauces', 'pack', 1, 'weekly'),

  item('samuli', 'صامولي', 'bakery', 'piece', 40, 'daily'),
  item('burger-bun', 'خبز برغر', 'bakery', 'piece', 20, 'daily'),
  item('flour', 'طحين', 'bakery', 'pack', 1, 'weekly'),
  item('fatoush-bread', 'خبز فتوش', 'bakery', 'pack', 2, 'daily'),

  item('arabic-box', 'بوكس عربي', 'plastic', 'carton', 1, 'weekly'),
  item('potato-cups', 'علب بطاطس', 'plastic', 'carton', 1, 'weekly'),
  item('sauce-cups', 'علب صوصات', 'plastic', 'carton', 1, 'weekly'),
  item('dough-bags', 'أكياس عجين', 'plastic', 'carton', 1, 'weekly'),
  item('gloves', 'قفازات', 'plastic', 'carton', 1, 'weekly'),
  item('masks', 'كمامات', 'plastic', 'carton', 1, 'weekly'),
  item('hairnet', 'غطاء شعر', 'plastic', 'carton', 1, 'weekly'),
  item('burger-foam', 'فلين برغر', 'plastic', 'carton', 1, 'weekly'),
  item('butter-paper', 'ورق ساندويتش زبدة', 'plastic', 'carton', 1, 'weekly'),
  item('foil', 'قصدير', 'plastic', 'carton', 1, 'weekly'),
  item('wrap', 'تغليف', 'plastic', 'carton', 1, 'weekly'),
  item('paper-bags', 'أكياس ورقية', 'plastic', 'carton', 1, 'weekly'),
  item('plastic-bags', 'أكياس بلاستيك', 'plastic', 'carton', 1, 'weekly'),
  item('drink-bags', 'أكياس بلاستيك للمشروب', 'plastic', 'carton', 1, 'weekly'),
  item('invoice-paper', 'ورق فواتير', 'plastic', 'carton', 1, 'weekly'),
  item('receipt-paper', 'ورق إيصال', 'plastic', 'carton', 1, 'weekly'),
  item('staples', 'دبابيس', 'plastic', 'pack', 1, 'weekly'),
  item('forks', 'شوك', 'plastic', 'carton', 1, 'weekly'),
  item('municipal-bags', 'أكياس بلدية', 'plastic', 'carton', 1, 'weekly'),
  item('tissues', 'مناديل', 'plastic', 'carton', 2, 'weekly'),
  item('cleaners', 'منظفات', 'plastic', 'carton', 1, 'weekly'),
  item('apron', 'مريول', 'plastic', 'piece', 4, 'weekly'),
]

const DAILY_CATEGORIES: CategoryId[] = ['chicken', 'spices', 'veg', 'bakery']

export function extraToCatalog(extra: ExtraItem): CatalogItem {
  return {
    id: extra.id,
    name: extra.name,
    category: extra.category,
    unit: extra.unit,
    minStock: 1,
    step: stepForUnit(extra.unit),
    countCycle: DAILY_CATEGORIES.includes(extra.category) ? 'daily' : 'weekly',
    custom: true,
  }
}

export function mergeCatalog(
  extras: ExtraItem[],
  unitOverrides: Record<string, Unit>,
): CatalogItem[] {
  return [...CATALOG, ...extras.map(extraToCatalog)].map((item) => {
    const unit = unitOverrides[item.id] ?? item.unit
    return { ...item, unit, step: stepForUnit(unit) }
  })
}
