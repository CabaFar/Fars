import { useEffect, useMemo, useRef, useState } from 'react'
import { CATALOG, CATEGORIES, UNIT_LABEL, type CatalogItem, type CategoryId } from './catalog'
import { exportInventory, importInventory, loadInventory, saveInventory } from './storage'
import {
  ARABIC_DAYS,
  BRANCHES,
  consumedCost,
  consumedQty,
  dateKeyFromParts,
  dayHasActivity,
  daysInMonth,
  expectedQty,
  formatMoney,
  formatQty,
  lastUnitCost,
  parseNum,
  resolveItemDay,
  type BranchId,
  type InventoryData,
  type ItemDay,
} from './types'

type Mode = 'morning' | 'evening' | 'report'
type CycleFilter = 'daily' | 'all'

function todayParts() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() }
}

function weekdayLabel(year: number, month: number, day: number) {
  return ARABIC_DAYS[new Date(year, month, day).getDay()]
}

function InventoryApp() {
  const now = todayParts()
  const [data, setData] = useState<InventoryData>(() => loadInventory())
  const [branch, setBranch] = useState<BranchId>('wasita')
  const [year, setYear] = useState(now.year)
  const [month, setMonth] = useState(now.month)
  const [day, setDay] = useState(Math.min(now.day, daysInMonth(now.year, now.month)))
  const [mode, setMode] = useState<Mode>('morning')
  const [category, setCategory] = useState<CategoryId | 'all'>('all')
  const [cycle, setCycle] = useState<CycleFilter>('daily')
  const [query, setQuery] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const totalDays = daysInMonth(year, month)
  const key = dateKeyFromParts(year, month, day)
  const weekday = weekdayLabel(year, month, day)

  useEffect(() => {
    saveInventory(data)
    setSavedFlash(true)
    const t = window.setTimeout(() => setSavedFlash(false), 1200)
    return () => window.clearTimeout(t)
  }, [data])

  useEffect(() => {
    const max = daysInMonth(year, month)
    if (day > max) setDay(max)
  }, [year, month, day])

  const patchItem = (itemId: string, patch: Partial<ItemDay>) => {
    setData((prev) => {
      const current = resolveItemDay(prev, branch, key, itemId)
      return {
        ...prev,
        [branch]: {
          ...prev[branch],
          [key]: {
            ...prev[branch][key],
            [itemId]: { ...current, ...patch },
          },
        },
      }
    })
  }

  const visibleItems = useMemo(() => {
    const q = query.trim()
    return CATALOG.filter((item) => {
      if (category !== 'all' && item.category !== category) return false
      if (mode === 'evening' && cycle === 'daily' && item.countCycle !== 'daily') return false
      if (q && !item.name.includes(q)) return false
      return true
    })
  }, [category, cycle, mode, query])

  const rows = visibleItems.map((item) => ({
    item,
    day: resolveItemDay(data, branch, key, item.id),
  }))

  const allRows = CATALOG.map((item) => ({
    item,
    day: resolveItemDay(data, branch, key, item.id),
  }))

  const purchaseCostTotal = allRows.reduce((sum, row) => sum + (row.day.purchaseCost || 0), 0)
  const countedDaily = CATALOG.filter((item) => item.countCycle === 'daily').filter(
    (item) => resolveItemDay(data, branch, key, item.id).counted,
  ).length
  const dailyCount = CATALOG.filter((item) => item.countCycle === 'daily').length
  const lowStock = allRows.filter(
    (row) => row.day.counted && row.day.closingQty < row.item.minStock,
  )
  const consumptionCost = allRows.reduce(
    (sum, row) =>
      sum + consumedCost(row.item, row.day, lastUnitCost(data, branch, key, row.item.id)),
    0,
  )
  const negativeCount = allRows.filter((row) => row.day.counted && consumedQty(row.day) < 0)

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth())
  }

  const goToday = () => {
    const t = todayParts()
    setYear(t.year)
    setMonth(t.month)
    setDay(t.day)
  }

  const copyExpectedToClosing = (item: CatalogItem) => {
    const current = resolveItemDay(data, branch, key, item.id)
    patchItem(item.id, { closingQty: expectedQty(current), counted: true })
  }

  const countAllExpected = () => {
    setData((prev) => {
      const nextDay = { ...prev[branch][key] }
      for (const item of visibleItems) {
        const current = resolveItemDay(prev, branch, key, item.id)
        nextDay[item.id] = {
          ...current,
          closingQty: expectedQty(current),
          counted: true,
        }
      }
      return {
        ...prev,
        [branch]: { ...prev[branch], [key]: nextDay },
      }
    })
  }

  const onImport = async (file: File | undefined) => {
    if (!file) return
    try {
      const imported = await importInventory(file)
      setData(imported)
    } catch {
      window.alert('تعذر قراءة ملف النسخة الاحتياطية')
    }
  }

  const monthLabel = new Intl.DateTimeFormat('ar-SA', { month: 'long', year: 'numeric' }).format(
    new Date(year, month, 1),
  )

  return (
    <div className="inv-app">
      <header className="inv-top no-print">
        <div className="inv-brand">
          <span className="inv-mark" aria-hidden>
            <span />
          </span>
          <div>
            <h1>مخزون شاورما</h1>
            <p>صباح: المشتريات · مساء: الجرد · الموجود من أمس يُنقل تلقائياً</p>
          </div>
        </div>
        <nav className="inv-links" aria-label="صفحات النظام">
          <a href="./">المحاسبة</a>
          <a href="./cash.html">الكاش</a>
          <a className="current" href="./inventory.html">
            المخزون
          </a>
        </nav>
        <div className={`inv-save ${savedFlash ? 'on' : ''}`}>
          {savedFlash ? 'تم الحفظ' : 'حفظ تلقائي'}
        </div>
      </header>

      <section className="inv-kpis no-print" aria-label="ملخص اليوم">
        <article>
          <span>مشتريات اليوم</span>
          <strong>{formatMoney(purchaseCostTotal)} ر.س</strong>
        </article>
        <article>
          <span>تكلفة الاستهلاك</span>
          <strong>{formatMoney(consumptionCost)} ر.س</strong>
        </article>
        <article>
          <span>جرد يومي</span>
          <strong>
            {countedDaily} / {dailyCount}
          </strong>
        </article>
        <article className={lowStock.length ? 'alert' : ''}>
          <span>تحت الحد الأدنى</span>
          <strong>{lowStock.length}</strong>
        </article>
      </section>

      <section className="inv-toolbar no-print">
        <nav className="inv-branches" aria-label="الفرع">
          {BRANCHES.map((b) => (
            <button
              key={b.id}
              type="button"
              className={branch === b.id ? 'active' : ''}
              onClick={() => setBranch(b.id)}
            >
              {b.name}
            </button>
          ))}
        </nav>
        <nav className="inv-modes" aria-label="الوردية">
          <button
            type="button"
            className={mode === 'morning' ? 'active' : ''}
            onClick={() => setMode('morning')}
          >
            صباح — مشتريات
          </button>
          <button
            type="button"
            className={mode === 'evening' ? 'active' : ''}
            onClick={() => setMode('evening')}
          >
            مساء — جرد
          </button>
          <button
            type="button"
            className={mode === 'report' ? 'active' : ''}
            onClick={() => setMode('report')}
          >
            تقرير اليوم
          </button>
        </nav>
      </section>

      <section className="inv-day no-print">
        <div className="inv-day-head">
          <div>
            <h2>
              {weekday} {day} — {monthLabel}
            </h2>
            <p>أول المدة = الموجود في المخزن أول اليوم (عادة الباقي من جرد أمس)</p>
          </div>
          <div className="inv-month-nav">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="الشهر السابق">
              ›
            </button>
            <strong>{monthLabel}</strong>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="الشهر التالي">
              ‹
            </button>
            <button type="button" className="ghost" onClick={goToday}>
              اليوم
            </button>
          </div>
        </div>
        <div className="inv-day-grid" role="listbox" aria-label="أيام الشهر">
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
            const k = dateKeyFromParts(year, month, d)
            const filled = dayHasActivity(data[branch][k])
            const isToday =
              d === now.day && month === now.month && year === now.year
            return (
              <button
                key={d}
                type="button"
                role="option"
                aria-selected={day === d}
                className={[
                  'inv-day-btn',
                  day === d ? 'selected' : '',
                  filled ? 'filled' : '',
                  isToday ? 'today' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setDay(d)}
              >
                {d}
              </button>
            )
          })}
        </div>
      </section>

      {mode !== 'report' && (
        <section className="inv-filters no-print">
          <input
            className="inv-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث عن صنف..."
            aria-label="بحث عن صنف"
          />
          <div className="inv-chips">
            <button
              type="button"
              className={category === 'all' ? 'active' : ''}
              onClick={() => setCategory('all')}
            >
              الكل
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={category === cat.id ? 'active' : ''}
                onClick={() => setCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
          {mode === 'evening' && (
            <div className="inv-cycle">
              <button
                type="button"
                className={cycle === 'daily' ? 'active' : ''}
                onClick={() => setCycle('daily')}
              >
                جرد يومي فقط
              </button>
              <button
                type="button"
                className={cycle === 'all' ? 'active' : ''}
                onClick={() => setCycle('all')}
              >
                كل الأصناف
              </button>
              <button type="button" className="ghost" onClick={countAllExpected}>
                اعتماد الرصيد المتوقع للجرد الظاهر
              </button>
              <button type="button" className="ghost" onClick={() => window.print()}>
                طباعة ورقة الجرد
              </button>
            </div>
          )}
        </section>
      )}

      {mode === 'morning' && (
        <section className="inv-sheet">
          <div className="inv-sheet-head">
            <h3>إدخال مشتريات بداية اليوم</h3>
            <p>الخضار بالريال · الدجاج والبهارات بالكيلو · الباقي حسب الوحدة المكتوبة</p>
          </div>
          <div className="inv-howto">
            <h4>طريقة التسجيل</h4>
            <ol>
              <li>
                <b>أول المدة:</b> الكمية الموجودة عند فتح المطعم. أول يوم اكتب الموجود الآن، وبعدها
                النظام ينقلها من جرد أمس تلقائياً.
              </li>
              <li>
                <b>المشترى اليوم:</b> الكمية التي اشتريتها هذا الصباح، و<b>سعر الشراء</b> بالريال.
              </li>
              <li>
                <b>المساء:</b> اعدّ الباقي الفعلي واكتبه في الجرد. المستهلك = أول المدة + المشترى −
                الجرد.
              </li>
            </ol>
            <p>
              مثال: دجاج أول المدة 10 كجم، اشتريت 15 كجم، الجرد مساءً 8 كجم → المستهلك 17 كجم.
            </p>
          </div>
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th>الوحدة</th>
                  <th>أول المدة (الموجود الآن)</th>
                  <th>المشترى اليوم</th>
                  <th>سعر الشراء</th>
                  <th>المتوقع نهاية اليوم</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ item, day: rec }) => (
                  <ItemMorningRow
                    key={item.id}
                    item={item}
                    rec={rec}
                    onOpening={(value) => patchItem(item.id, { openingQty: value })}
                    onQty={(value) =>
                      patchItem(item.id, {
                        purchaseQty: value,
                        purchaseCost: item.unit === 'sar' ? value : rec.purchaseCost,
                      })
                    }
                    onCost={(value) =>
                      patchItem(item.id, {
                        purchaseCost: value,
                        purchaseQty: item.unit === 'sar' ? value : rec.purchaseQty,
                      })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {mode === 'evening' && (
        <section className="inv-sheet">
          <div className="inv-sheet-head">
            <h3>جرد نهاية اليوم</h3>
            <p>
              اكتب الباقي الفعلي بعد العد. الجرد اليومي للدجاج والخضار والخبز، وباقي الأصناف مرة في
              الأسبوع.
            </p>
          </div>
          {negativeCount.length > 0 && (
            <p className="inv-warn">
              يوجد {negativeCount.length} صنف جرده أعلى من الرصيد المتوقع — راجع العدّ.
            </p>
          )}
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th>أول المدة</th>
                  <th>المشترى</th>
                  <th>الجرد (الباقي)</th>
                  <th>المستهلك</th>
                  <th>الحالة</th>
                  <th className="no-print">اعتماد</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ item, day: rec }) => {
                  const used = consumedQty(rec)
                  const low = rec.counted && rec.closingQty < item.minStock
                  const bad = rec.counted && used < 0
                  return (
                    <tr key={item.id} className={low || bad ? 'row-alert' : rec.counted ? 'row-ok' : ''}>
                      <td>
                        <div className="inv-name">
                          <strong>{item.name}</strong>
                          <small>
                            {UNIT_LABEL[item.unit]} · حد {formatQty(item.minStock, item.unit)}
                          </small>
                        </div>
                      </td>
                      <td>{formatQty(rec.openingQty, item.unit)}</td>
                      <td>{formatQty(rec.purchaseQty, item.unit)}</td>
                      <td>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step={item.step}
                          value={rec.counted || rec.closingQty ? rec.closingQty : ''}
                          placeholder={String(expectedQty(rec))}
                          onChange={(e) =>
                            patchItem(item.id, {
                              closingQty: parseNum(e.target.value),
                              counted: true,
                            })
                          }
                        />
                      </td>
                      <td className={bad ? 'neg' : ''}>
                        {rec.counted ? formatQty(used, item.unit) : '—'}
                      </td>
                      <td>
                        {!rec.counted && <span className="pill wait">بانتظار الجرد</span>}
                        {rec.counted && low && <span className="pill low">ناقص</span>}
                        {rec.counted && bad && <span className="pill low">خطأ عدّ</span>}
                        {rec.counted && !low && !bad && <span className="pill ok">مكتمل</span>}
                      </td>
                      <td className="no-print">
                        <button type="button" className="tiny" onClick={() => copyExpectedToClosing(item)}>
                          المتوقع
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {mode === 'report' && (
        <section className="inv-sheet">
          <div className="inv-sheet-head">
            <h3>تقرير {weekday} {day}</h3>
            <p>
              {BRANCHES.find((b) => b.id === branch)?.name} · مشتريات {formatMoney(purchaseCostTotal)} ر.س
            </p>
          </div>

          <div className="inv-report-grid">
            <article>
              <h4>أصناف تحت الحد الأدنى</h4>
              {lowStock.length === 0 ? (
                <p className="muted">لا يوجد نقص بعد الجرد.</p>
              ) : (
                <ul>
                  {lowStock.map(({ item, day: rec }) => (
                    <li key={item.id}>
                      <span>{item.name}</span>
                      <b>
                        {formatQty(rec.closingQty, item.unit)} / حد {formatQty(item.minStock, item.unit)}
                      </b>
                    </li>
                  ))}
                </ul>
              )}
            </article>
            <article>
              <h4>استهلاك مقدّر حسب المجموعة</h4>
              <ul>
                {CATEGORIES.map((cat) => {
                  const sum = CATALOG.filter((item) => item.category === cat.id).reduce(
                    (acc, item) =>
                      acc +
                      consumedCost(
                        item,
                        resolveItemDay(data, branch, key, item.id),
                        lastUnitCost(data, branch, key, item.id),
                      ),
                    0,
                  )
                  if (!sum) return null
                  return (
                    <li key={cat.id}>
                      <span>{cat.name}</span>
                      <b>{formatMoney(sum)} ر.س</b>
                    </li>
                  )
                })}
              </ul>
            </article>
          </div>

          <div className="inv-notes">
            <h4>معنى الخانات</h4>
            <ol>
              <li>
                <b>أول المدة:</b> الموجود في المخزن أول اليوم. أول مرة تكتبها بنفسك، وبعدها تُنقل من
                جرد أمس.
              </li>
              <li>
                <b>المشترى:</b> اللي دخل اليوم (كمية + سعر). الخضار تُكتب بالريال.
              </li>
              <li>
                <b>الجرد:</b> الباقي الفعلي بعد العد مساءً.
              </li>
              <li>
                <b>المستهلك:</b> أول المدة + المشترى − الجرد، ويصير جرد اليوم أول مدة لبكرة.
              </li>
            </ol>
          </div>

          <div className="inv-backup no-print">
            <button type="button" onClick={() => exportInventory(data)}>
              تنزيل نسخة احتياطية
            </button>
            <button type="button" className="ghost" onClick={() => fileRef.current?.click()}>
              استعادة نسخة
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                void onImport(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>
        </section>
      )}

      <section className="inv-print-only" aria-hidden>
        <h1>ورقة جرد شاورما — {BRANCHES.find((b) => b.id === branch)?.name}</h1>
        <p>
          {weekday} {day} / {month + 1} / {year}
        </p>
        <table>
          <thead>
            <tr>
              <th>الصنف</th>
              <th>الوحدة</th>
              <th>أول المدة</th>
              <th>مشترى</th>
              <th>الجرد الفعلي</th>
            </tr>
          </thead>
          <tbody>
            {(cycle === 'daily' ? CATALOG.filter((i) => i.countCycle === 'daily') : CATALOG).map(
              (item) => {
                const rec = resolveItemDay(data, branch, key, item.id)
                return (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{UNIT_LABEL[item.unit]}</td>
                    <td>{formatQty(rec.openingQty, item.unit)}</td>
                    <td>{formatQty(rec.purchaseQty, item.unit)}</td>
                    <td />
                  </tr>
                )
              },
            )}
          </tbody>
        </table>
      </section>

      <footer className="inv-footer no-print">
        البيانات تُحفظ على هذا الجهاز · الأحمر والأبيض لواجهة تشغيل يومية واضحة
      </footer>
    </div>
  )
}

function ItemMorningRow({
  item,
  rec,
  onOpening,
  onQty,
  onCost,
}: {
  item: CatalogItem
  rec: ItemDay
  onOpening: (value: number) => void
  onQty: (value: number) => void
  onCost: (value: number) => void
}) {
  const isSar = item.unit === 'sar'
  return (
    <tr>
      <td>
        <div className="inv-name">
          <strong>{item.name}</strong>
          <small>
            {item.countCycle === 'daily' ? 'جرد يومي' : 'جرد أسبوعي'} · {UNIT_LABEL[item.unit]}
          </small>
        </div>
      </td>
      <td>{UNIT_LABEL[item.unit]}</td>
      <td>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step={item.step}
          value={rec.openingQty || ''}
          placeholder="0"
          onChange={(e) => onOpening(parseNum(e.target.value))}
        />
      </td>
      <td>
        {isSar ? (
          <span className="muted">نفس التكلفة</span>
        ) : (
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step={item.step}
            value={rec.purchaseQty || ''}
            placeholder="0"
            onChange={(e) => onQty(parseNum(e.target.value))}
          />
        )}
      </td>
      <td>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step={isSar ? 1 : 0.01}
          value={rec.purchaseCost || ''}
          placeholder="0"
          onChange={(e) => onCost(parseNum(e.target.value))}
        />
      </td>
      <td>{formatQty(expectedQty(rec), item.unit)}</td>
    </tr>
  )
}

export default InventoryApp
