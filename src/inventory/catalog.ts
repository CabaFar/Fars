export type Unit =
  | 'kg'
  | 'sar'
  | 'carton'
  | 'tank'
  | 'piece'
  | 'bag'
  | 'can'
  | 'gallon'
  | 'bucket'
  | 'bundle'
  | 'box'

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
}

export const CATEGORIES: { id: CategoryId; name: string; hint: string }[] = [
  { id: 'chicken', name: 'الدجاج', hint: 'يُسجَّل بالكيلو والجرام' },
  { id: 'spices', name: 'البهارات', hint: 'يُسجَّل بالكيلو والجرام' },
  { id: 'veg', name: 'الخضار', hint: 'يُسجَّل بالقيمة بالريال' },
  { id: 'dry', name: 'جاف وسوائل', hint: 'كرتون · تنك · كيس' },
  { id: 'frozen', name: 'المجمدات', hint: 'يُسجَّل بالكرتون' },
  { id: 'sauces', name: 'الصوصات', hint: 'علبة · كرتون · جالون · سطل' },
  { id: 'bakery', name: 'المخبوزات والطحين', hint: 'حبة · كيس · ربطة' },
  { id: 'plastic', name: 'بلاستيك وتغليف', hint: 'مستهلكات يومية وأسبوعية' },
]

export const UNIT_LABEL: Record<Unit, string> = {
  kg: 'كجم',
  sar: 'ريال',
  carton: 'كرتون',
  tank: 'تنك',
  piece: 'حبة',
  bag: 'كيس',
  can: 'علبة',
  gallon: 'جالون',
  bucket: 'سطل',
  bundle: 'ربطة',
  box: 'علبة',
}

export const CATALOG: CatalogItem[] = [
  {
    id: 'chicken',
    name: 'دجاج',
    category: 'chicken',
    unit: 'kg',
    minStock: 8,
    step: 0.05,
    countCycle: 'daily',
  },
  {
    id: 'spices',
    name: 'بهارات',
    category: 'spices',
    unit: 'kg',
    minStock: 1,
    step: 0.05,
    countCycle: 'daily',
  },

  { id: 'lettuce', name: 'خس', category: 'veg', unit: 'sar', minStock: 20, step: 1, countCycle: 'daily' },
  { id: 'hot-pepper', name: 'فلفل حار', category: 'veg', unit: 'sar', minStock: 10, step: 1, countCycle: 'daily' },
  { id: 'mild-pepper', name: 'فلفل بارد', category: 'veg', unit: 'sar', minStock: 10, step: 1, countCycle: 'daily' },
  {
    id: 'red-hot-pepper',
    name: 'فلفل حار أحمر',
    category: 'veg',
    unit: 'sar',
    minStock: 8,
    step: 1,
    countCycle: 'daily',
  },
  { id: 'tomato', name: 'طماط', category: 'veg', unit: 'sar', minStock: 20, step: 1, countCycle: 'daily' },
  { id: 'parsley', name: 'بقدونس', category: 'veg', unit: 'sar', minStock: 8, step: 1, countCycle: 'daily' },
  { id: 'cucumber', name: 'خيار', category: 'veg', unit: 'sar', minStock: 10, step: 1, countCycle: 'daily' },
  { id: 'garlic', name: 'ثوم', category: 'veg', unit: 'sar', minStock: 15, step: 1, countCycle: 'daily' },
  { id: 'orange', name: 'برتقال', category: 'veg', unit: 'sar', minStock: 10, step: 1, countCycle: 'daily' },
  { id: 'lemon', name: 'ليمون', category: 'veg', unit: 'sar', minStock: 10, step: 1, countCycle: 'daily' },
  {
    id: 'fresh-potato',
    name: 'بطاطس طازج',
    category: 'veg',
    unit: 'sar',
    minStock: 20,
    step: 1,
    countCycle: 'daily',
  },

  { id: 'salt', name: 'ملح', category: 'dry', unit: 'carton', minStock: 1, step: 1, countCycle: 'weekly' },
  { id: 'sugar', name: 'سكر', category: 'dry', unit: 'carton', minStock: 1, step: 1, countCycle: 'weekly' },
  {
    id: 'zahreti-oil',
    name: 'زيت زهرتي',
    category: 'dry',
    unit: 'carton',
    minStock: 1,
    step: 1,
    countCycle: 'weekly',
  },
  { id: 'dalal-oil', name: 'زيت دلال', category: 'dry', unit: 'tank', minStock: 1, step: 1, countCycle: 'weekly' },
  { id: 'eggs', name: 'بيض', category: 'dry', unit: 'carton', minStock: 1, step: 1, countCycle: 'weekly' },
  {
    id: 'food-color',
    name: 'ملون طعام',
    category: 'dry',
    unit: 'carton',
    minStock: 1,
    step: 1,
    countCycle: 'weekly',
  },
  { id: 'lemon-salt', name: 'ملح ليمون', category: 'dry', unit: 'bag', minStock: 1, step: 1, countCycle: 'weekly' },
  { id: 'burghul', name: 'برغل', category: 'dry', unit: 'bag', minStock: 1, step: 1, countCycle: 'weekly' },

  {
    id: 'frozen-potato',
    name: 'بطاطس مجمد',
    category: 'frozen',
    unit: 'carton',
    minStock: 2,
    step: 1,
    countCycle: 'weekly',
  },
  {
    id: 'chicken-burger',
    name: 'برغر دجاج',
    category: 'frozen',
    unit: 'carton',
    minStock: 1,
    step: 1,
    countCycle: 'weekly',
  },
  { id: 'akkawi', name: 'جبن عكاوي', category: 'frozen', unit: 'carton', minStock: 1, step: 1, countCycle: 'weekly' },
  {
    id: 'mozzarella',
    name: 'موزاريلا',
    category: 'frozen',
    unit: 'carton',
    minStock: 1,
    step: 1,
    countCycle: 'weekly',
  },
  {
    id: 'sliced-cheese',
    name: 'جبن شرائح',
    category: 'frozen',
    unit: 'carton',
    minStock: 1,
    step: 1,
    countCycle: 'weekly',
  },

  {
    id: 'pepper-paste',
    name: 'معجون فلفل',
    category: 'sauces',
    unit: 'can',
    minStock: 2,
    step: 1,
    countCycle: 'weekly',
  },
  {
    id: 'tomato-paste',
    name: 'معجون طماط',
    category: 'sauces',
    unit: 'can',
    minStock: 2,
    step: 1,
    countCycle: 'weekly',
  },
  { id: 'ketchup', name: 'كاتشب', category: 'sauces', unit: 'carton', minStock: 1, step: 1, countCycle: 'weekly' },
  { id: 'vinegar', name: 'خل', category: 'sauces', unit: 'gallon', minStock: 1, step: 1, countCycle: 'weekly' },
  { id: 'shatta', name: 'شطة', category: 'sauces', unit: 'carton', minStock: 1, step: 1, countCycle: 'weekly' },
  { id: 'tahini', name: 'طحينة', category: 'sauces', unit: 'carton', minStock: 1, step: 1, countCycle: 'weekly' },
  {
    id: 'pomegranate',
    name: 'دبس رمان',
    category: 'sauces',
    unit: 'carton',
    minStock: 1,
    step: 1,
    countCycle: 'weekly',
  },
  { id: 'pickles', name: 'مخلل', category: 'sauces', unit: 'bucket', minStock: 1, step: 1, countCycle: 'weekly' },

  { id: 'samuli', name: 'صامولي', category: 'bakery', unit: 'piece', minStock: 40, step: 1, countCycle: 'daily' },
  {
    id: 'burger-bun',
    name: 'خبز برغر',
    category: 'bakery',
    unit: 'piece',
    minStock: 20,
    step: 1,
    countCycle: 'daily',
  },
  { id: 'flour', name: 'طحين', category: 'bakery', unit: 'bag', minStock: 1, step: 1, countCycle: 'weekly' },
  {
    id: 'fatoush-bread',
    name: 'خبز فتوش',
    category: 'bakery',
    unit: 'bundle',
    minStock: 2,
    step: 1,
    countCycle: 'daily',
  },

  { id: 'arabic-box', name: 'بوكس عربي', category: 'plastic', unit: 'carton', minStock: 1, step: 1, countCycle: 'weekly' },
  {
    id: 'potato-cups',
    name: 'علب بطاطس',
    category: 'plastic',
    unit: 'carton',
    minStock: 1,
    step: 1,
    countCycle: 'weekly',
  },
  {
    id: 'sauce-cups',
    name: 'علب صوصات',
    category: 'plastic',
    unit: 'carton',
    minStock: 1,
    step: 1,
    countCycle: 'weekly',
  },
  {
    id: 'dough-bags',
    name: 'أكياس عجين',
    category: 'plastic',
    unit: 'carton',
    minStock: 1,
    step: 1,
    countCycle: 'weekly',
  },
  { id: 'gloves', name: 'قفازات', category: 'plastic', unit: 'carton', minStock: 1, step: 1, countCycle: 'weekly' },
  { id: 'masks', name: 'كمامات', category: 'plastic', unit: 'carton', minStock: 1, step: 1, countCycle: 'weekly' },
  { id: 'hairnet', name: 'غطاء شعر', category: 'plastic', unit: 'carton', minStock: 1, step: 1, countCycle: 'weekly' },
  {
    id: 'burger-foam',
    name: 'فلين برغر',
    category: 'plastic',
    unit: 'carton',
    minStock: 1,
    step: 1,
    countCycle: 'weekly',
  },
  {
    id: 'butter-paper',
    name: 'ورق ساندويتش زبدة',
    category: 'plastic',
    unit: 'carton',
    minStock: 1,
    step: 1,
    countCycle: 'weekly',
  },
  { id: 'foil', name: 'قصدير', category: 'plastic', unit: 'carton', minStock: 1, step: 1, countCycle: 'weekly' },
  { id: 'wrap', name: 'تغليف', category: 'plastic', unit: 'carton', minStock: 1, step: 1, countCycle: 'weekly' },
  {
    id: 'paper-bags',
    name: 'أكياس ورقية',
    category: 'plastic',
    unit: 'carton',
    minStock: 1,
    step: 1,
    countCycle: 'weekly',
  },
  {
    id: 'plastic-bags',
    name: 'أكياس بلاستيك',
    category: 'plastic',
    unit: 'carton',
    minStock: 1,
    step: 1,
    countCycle: 'weekly',
  },
  {
    id: 'drink-bags',
    name: 'أكياس بلاستيك للمشروب',
    category: 'plastic',
    unit: 'carton',
    minStock: 1,
    step: 1,
    countCycle: 'weekly',
  },
  {
    id: 'invoice-paper',
    name: 'ورق فواتير',
    category: 'plastic',
    unit: 'carton',
    minStock: 1,
    step: 1,
    countCycle: 'weekly',
  },
  {
    id: 'receipt-paper',
    name: 'ورق إيصال',
    category: 'plastic',
    unit: 'carton',
    minStock: 1,
    step: 1,
    countCycle: 'weekly',
  },
  { id: 'staples', name: 'دبابيس', category: 'plastic', unit: 'box', minStock: 1, step: 1, countCycle: 'weekly' },
  { id: 'forks', name: 'شوك', category: 'plastic', unit: 'carton', minStock: 1, step: 1, countCycle: 'weekly' },
  {
    id: 'municipal-bags',
    name: 'أكياس بلدية',
    category: 'plastic',
    unit: 'carton',
    minStock: 1,
    step: 1,
    countCycle: 'weekly',
  },
  { id: 'tissues', name: 'مناديل', category: 'plastic', unit: 'carton', minStock: 2, step: 1, countCycle: 'weekly' },
  { id: 'cleaners', name: 'منظفات', category: 'plastic', unit: 'carton', minStock: 1, step: 1, countCycle: 'weekly' },
  { id: 'apron', name: 'مريول', category: 'plastic', unit: 'piece', minStock: 4, step: 1, countCycle: 'weekly' },
]

export const CATALOG_BY_ID = Object.fromEntries(CATALOG.map((item) => [item.id, item])) as Record<
  string,
  CatalogItem
>
