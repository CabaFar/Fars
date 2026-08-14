import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CATEGORIES,
  UNITS,
  UNIT_LABEL,
  mergeCatalog,
  type CatalogItem,
  type CategoryId,
  type ExtraItem,
  type Unit,
} from './catalog'
import {
  exportInventory,
  importInventory,
  loadExtras,
  loadInventory,
  loadMetaOverrides,
  loadPrices,
  loadRemovedIds,
  loadUnitOverrides,
  saveExtras,
  saveInventory,
  saveMetaOverrides,
  savePrices,
  saveRemovedIds,
  saveUnitOverrides,
  type ItemMetaOverrides,
} from './storage'
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
  lastSupplier,
  lastUnitCost,
  lineTotal,
  parseNum,
  resolveItemDay,
  type BranchId,
  type InventoryData,
  type ItemDay,
  type PriceList,
  type UnitOverrides,
} from './types'

type Mode = 'morning' | 'evening' | 'prices' | 'report'
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
  const [prices, setPrices] = useState<PriceList>(() => loadPrices())
  const [extras, setExtras] = useState<ExtraItem[]>(() => loadExtras())
  const [units, setUnits] = useState<UnitOverrides>(() => loadUnitOverrides())
  const [removedIds, setRemovedIds] = useState<string[]>(() => loadRemovedIds())
  const [meta, setMeta] = useState<ItemMetaOverrides>(() => loadMetaOverrides())
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null)
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
  const allItems = useMemo(
    () => mergeCatalog(extras, units, removedIds, meta),
    [extras, units, removedIds, meta],
  )

  useEffect(() => {
    saveInventory(data)
    savePrices(prices)
    saveExtras(extras)
    saveUnitOverrides(units)
    saveRemovedIds(removedIds)
    saveMetaOverrides(meta)
    setSavedFlash(true)
    const t = window.setTimeout(() => setSavedFlash(false), 1200)
    return () => window.clearTimeout(t)
  }, [data, prices, extras, units, removedIds, meta])

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

  const listedPrice = (itemId: string, rec: ItemDay, branchId: BranchId = branch) => {
    if (rec.unitPrice > 0) return rec.unitPrice
    return prices[branchId][itemId] || lastUnitCost(data, branchId, key, itemId) || 0
  }

  const setListedPrice = (itemId: string, value: number) => {
    setPrices((prev) => ({
      ...prev,
      [branch]: { ...prev[branch], [itemId]: value },
    }))
  }

  const setItemUnit = (itemId: string, unit: Unit) => {
    setUnits((prev) => ({ ...prev, [itemId]: unit }))
  }

  const patchPurchase = (item: CatalogItem, qty: number, unitPrice: number) => {
    patchItem(item.id, {
      purchaseQty: qty,
      unitPrice,
      purchaseCost: lineTotal(qty, unitPrice),
    })
    if (unitPrice > 0) setListedPrice(item.id, unitPrice)
  }

  const addItem = (categoryId: CategoryId, name: string, unit: Unit) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setExtras((prev) => [
      ...prev,
      { id: `custom-${Date.now()}`, name: trimmed, category: categoryId, unit },
    ])
  }

  const removeItem = (item: CatalogItem) => {
    const ok = window.confirm(`حذف الصنف «${item.name}» من القائمة؟`)
    if (!ok) return
    if (item.custom) {
      setExtras((prev) => prev.filter((row) => row.id !== item.id))
    } else {
      setRemovedIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]))
    }
    setUnits((prev) => {
      if (!(item.id in prev)) return prev
      const next = { ...prev }
      delete next[item.id]
      return next
    })
    setMeta((prev) => {
      if (!(item.id in prev)) return prev
      const next = { ...prev }
      delete next[item.id]
      return next
    })
  }

  const saveEditedItem = (item: CatalogItem, name: string, unit: Unit, categoryId: CategoryId) => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (item.custom) {
      setExtras((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, name: trimmed, unit, category: categoryId } : row,
        ),
      )
    } else {
      setMeta((prev) => ({
        ...prev,
        [item.id]: { name: trimmed, category: categoryId },
      }))
    }
    setItemUnit(item.id, unit)
    setEditingItem(null)
  }

  const visibleItems = useMemo(() => {
    const q = query.trim()
    return allItems.filter((item) => {
      if (category !== 'all' && item.category !== category) return false
      if (mode === 'evening' && cycle === 'daily' && item.countCycle !== 'daily') return false
      if (q && !item.name.includes(q)) return false
      return true
    })
  }, [allItems, category, cycle, mode, query])

  const grouped = CATEGORIES.map((cat) => ({
    cat,
    items: visibleItems.filter((item) => item.category === cat.id),
  })).filter((group) => {
    if (group.items.length > 0) return true
    if (query.trim()) return false
    if (mode !== 'morning' && mode !== 'prices') return false
    return category === 'all' || category === group.cat.id
  })

  const rows = visibleItems.map((item) => ({
    item,
    day: resolveItemDay(data, branch, key, item.id),
  }))

  const allRows = allItems.map((item) => ({
    item,
    day: resolveItemDay(data, branch, key, item.id),
  }))

  const purchaseCostTotal = allRows.reduce((sum, row) => sum + (row.day.purchaseCost || 0), 0)
  const countedDaily = allItems.filter((item) => item.countCycle === 'daily').filter(
    (item) => resolveItemDay(data, branch, key, item.id).counted,
  ).length
  const dailyCount = allItems.filter((item) => item.countCycle === 'daily').length
  const lowStock = allRows.filter(
    (row) => row.day.counted && row.day.closingQty < row.item.minStock,
  )
  const consumptionCost = allRows.reduce(
    (sum, row) => sum + consumedCost(row.item, row.day, listedPrice(row.item.id, row.day)),
    0,
  )
  const negativeCount = allRows.filter((row) => row.day.counted && consumedQty(row.day) < 0)

  const dayPurchaseFor = (branchId: BranchId) =>
    allItems.reduce((sum, item) => {
      const rec = resolveItemDay(data, branchId, key, item.id)
      return sum + (rec.purchaseCost || 0)
    }, 0)

  const monthPurchaseFor = (branchId: BranchId) => {
    let total = 0
    for (let d = 1; d <= totalDays; d++) {
      const k = dateKeyFromParts(year, month, d)
      for (const item of allItems) {
        total += data[branchId][k]?.[item.id]?.purchaseCost || 0
      }
    }
    return total
  }

  const wasitaDay = dayPurchaseFor('wasita')
  const beirutDay = dayPurchaseFor('beirut')
  const branchesDayTotal = wasitaDay + beirutDay
  const branchesMonthTotal = monthPurchaseFor('wasita') + monthPurchaseFor('beirut')

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
      setData(imported.data)
      setPrices(imported.prices)
      setExtras(imported.extras)
      setUnits(imported.units)
      setRemovedIds(imported.removedIds ?? [])
      setMeta(imported.meta ?? {})
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
            <p>الموجود الآن · الجديد · السعر · المورد</p>
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

      <section className="inv-grand no-print" aria-label="إجمالي الفروع">
        <h2>إجمالي الفروع</h2>
        <div className="inv-grand-grid">
          <article>
            <span>مشتريات اليوم (الفرعين)</span>
            <strong>{formatMoney(branchesDayTotal)} ر.س</strong>
          </article>
          <article>
            <span>الوسيطاء اليوم</span>
            <strong>{formatMoney(wasitaDay)} ر.س</strong>
          </article>
          <article>
            <span>بيروت اليوم</span>
            <strong>{formatMoney(beirutDay)} ر.س</strong>
          </article>
          <article>
            <span>مشتريات الشهر (الفرعين)</span>
            <strong>{formatMoney(branchesMonthTotal)} ر.س</strong>
          </article>
        </div>
      </section>

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
            className={mode === 'prices' ? 'active' : ''}
            onClick={() => setMode('prices')}
          >
            الأسعار
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

      {mode !== 'prices' && (
        <section className="inv-day no-print">
          <div className="inv-day-head">
            <div>
              <h2>
                {weekday} {day} — {monthLabel}
              </h2>
              <p>الموجود الآن = الباقي من جرد أمس · الجديد = المشترى اليوم · السعر منفصل عن الكمية</p>
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
              const isToday = d === now.day && month === now.month && year === now.year
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
      )}

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
            <p>
              الموجود الآن = الكمية الحالية · الجديد = كمية المشترى · السعر = سعر الوحدة بالريال ·
              المورد = اسم المورد
            </p>
          </div>
          {grouped.map(({ cat, items }) => (
            <div key={cat.id} className="inv-cat">
              <h4>{cat.name}</h4>
              <div className="inv-table-wrap">
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th>الصنف</th>
                      <th>الوحدة</th>
                      <th>الموجود الآن</th>
                      <th>الجديد</th>
                      <th>السعر</th>
                      <th>المورد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const rec = resolveItemDay(data, branch, key, item.id)
                      const unitPrice = listedPrice(item.id, rec)
                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="inv-name">
                              <strong>{item.name}</strong>
                              <div className="inv-item-actions">
                                <button
                                  type="button"
                                  className="tiny"
                                  onClick={() => setEditingItem(item)}
                                >
                                  تعديل
                                </button>
                                <button
                                  type="button"
                                  className="tiny danger"
                                  onClick={() => removeItem(item)}
                                >
                                  حذف
                                </button>
                              </div>
                            </div>
                          </td>
                          <td>
                            <UnitSelect value={item.unit} onChange={(unit) => setItemUnit(item.id, unit)} />
                          </td>
                          <td>
                            <NumInput
                              step={item.step}
                              value={rec.openingQty}
                              onChange={(value) => patchItem(item.id, { openingQty: value })}
                            />
                          </td>
                          <td>
                            <NumInput
                              step={item.step}
                              value={rec.purchaseQty}
                              onChange={(value) => patchPurchase(item, value, unitPrice)}
                            />
                          </td>
                          <td>
                            <NumInput
                              step={0.01}
                              value={unitPrice}
                              onChange={(value) => patchPurchase(item, rec.purchaseQty, value)}
                            />
                          </td>
                          <td>
                            <input
                              className="text-input"
                              value={rec.supplier}
                              placeholder={lastSupplier(data, branch, key, item.id) || 'اسم المورد'}
                              onChange={(e) => patchItem(item.id, { supplier: e.target.value })}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <AddItemRow categoryId={cat.id} onAdd={addItem} />
            </div>
          ))}
        </section>
      )}

      {mode === 'prices' && (
        <section className="inv-sheet">
          <div className="inv-sheet-head">
            <h3>أسعار الأصناف — {BRANCHES.find((b) => b.id === branch)?.name}</h3>
            <p>سعر الوحدة بالريال حسب الوحدة المختارة (حبة · كيلو · كرتون · شد · تنك)</p>
          </div>
          {grouped.map(({ cat, items }) => (
            <div key={cat.id} className="inv-cat">
              <h4>{cat.name}</h4>
              <div className="inv-table-wrap">
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th>الصنف</th>
                      <th>الوحدة</th>
                      <th>السعر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="inv-name">
                            <strong>{item.name}</strong>
                            <div className="inv-item-actions">
                              <button
                                type="button"
                                className="tiny"
                                onClick={() => setEditingItem(item)}
                              >
                                تعديل
                              </button>
                              <button
                                type="button"
                                className="tiny danger"
                                onClick={() => removeItem(item)}
                              >
                                حذف
                              </button>
                            </div>
                          </div>
                        </td>
                        <td>
                          <UnitSelect value={item.unit} onChange={(unit) => setItemUnit(item.id, unit)} />
                        </td>
                        <td>
                          <NumInput
                            step={0.01}
                            value={prices[branch][item.id] || 0}
                            onChange={(value) => setListedPrice(item.id, value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <AddItemRow categoryId={cat.id} onAdd={addItem} />
            </div>
          ))}
        </section>
      )}

      {mode === 'evening' && (
        <section className="inv-sheet">
          <div className="inv-sheet-head">
            <h3>جرد نهاية اليوم</h3>
            <p>اكتب الباقي الفعلي بعد العد. المستهلك = الموجود الآن + الجديد − الجرد.</p>
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
                  <th>الوحدة</th>
                  <th>الموجود الآن</th>
                  <th>الجديد</th>
                  <th>الجرد (الباقي)</th>
                  <th>المستهلك</th>
                  <th>المورد</th>
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
                        <strong>{item.name}</strong>
                      </td>
                      <td>
                        <UnitSelect value={item.unit} onChange={(unit) => setItemUnit(item.id, unit)} />
                      </td>
                      <td>{formatQty(rec.openingQty, item.unit)}</td>
                      <td>{formatQty(rec.purchaseQty, item.unit)}</td>
                      <td>
                        <NumInput
                          step={item.step}
                          value={rec.counted || rec.closingQty ? rec.closingQty : 0}
                          placeholder={String(expectedQty(rec))}
                          emptyWhenZero={!rec.counted && rec.closingQty === 0}
                          onChange={(value) =>
                            patchItem(item.id, { closingQty: value, counted: true })
                          }
                        />
                      </td>
                      <td className={bad ? 'neg' : ''}>
                        {rec.counted ? formatQty(used, item.unit) : '—'}
                      </td>
                      <td>{rec.supplier || lastSupplier(data, branch, key, item.id) || '—'}</td>
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
            <h3>
              تقرير {weekday} {day}
            </h3>
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
                  const sum = allItems
                    .filter((item) => item.category === cat.id)
                    .reduce(
                      (acc, item) =>
                        acc +
                        consumedCost(
                          item,
                          resolveItemDay(data, branch, key, item.id),
                          listedPrice(item.id, resolveItemDay(data, branch, key, item.id)),
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
                <b>الموجود الآن:</b> الكمية الحالية أول اليوم (من جرد أمس).
              </li>
              <li>
                <b>الجديد:</b> كمية المشترى اليوم، و<b>السعر</b> سعر الوحدة بالريال (منفصل عن الكمية).
              </li>
              <li>
                <b>المورد:</b> اسم المورد لهذا الصنف.
              </li>
              <li>
                <b>الوحدة:</b> حبة أو كيلو أو كرتون أو شد أو تنك، ويمكن تغييرها لأي صنف. الغاز وحدته تنك.
              </li>
              <li>
                <b>حذف صنف:</b> من زر «حذف» بجانب اسم الصنف في المشتريات أو الأسعار.
              </li>
              <li>
                <b>تعديل صنف:</b> من زر «تعديل» لتغيير الاسم أو الوحدة أو القسم.
              </li>
            </ol>
          </div>
          <div className="inv-backup no-print">
            <button
              type="button"
              onClick={() =>
                exportInventory({ version: 5, data, prices, extras, units, removedIds, meta })
              }
            >
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
              <th>الموجود الآن</th>
              <th>الجديد</th>
              <th>الجرد الفعلي</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => {
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
            })}
          </tbody>
        </table>
      </section>

      {editingItem && (
        <EditItemDialog
          item={editingItem}
          onCancel={() => setEditingItem(null)}
          onSave={saveEditedItem}
        />
      )}

      <footer className="inv-footer no-print">البيانات تُحفظ على هذا الجهاز</footer>
    </div>
  )
}

function EditItemDialog({
  item,
  onCancel,
  onSave,
}: {
  item: CatalogItem
  onCancel: () => void
  onSave: (item: CatalogItem, name: string, unit: Unit, categoryId: CategoryId) => void
}) {
  const [name, setName] = useState(item.name)
  const [unit, setUnit] = useState<Unit>(item.unit)
  const [categoryId, setCategoryId] = useState<CategoryId>(item.category)

  return (
    <div className="inv-modal-backdrop" role="presentation" onClick={onCancel}>
      <form
        className="inv-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-item-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          onSave(item, name, unit, categoryId)
        }}
      >
        <h3 id="edit-item-title">تعديل الصنف</h3>
        <label className="inv-modal-field">
          <span>اسم الصنف</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
            aria-label="اسم الصنف"
          />
        </label>
        <label className="inv-modal-field">
          <span>القسم</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value as CategoryId)}
            aria-label="قسم الصنف"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>
        <label className="inv-modal-field">
          <span>الوحدة</span>
          <UnitSelect value={unit} onChange={setUnit} />
        </label>
        <div className="inv-modal-actions">
          <button type="button" className="ghost" onClick={onCancel}>
            إلغاء
          </button>
          <button type="submit">حفظ التعديل</button>
        </div>
      </form>
    </div>
  )
}

function UnitSelect({ value, onChange }: { value: Unit; onChange: (unit: Unit) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Unit)} aria-label="الوحدة">
      {UNITS.map((unit) => (
        <option key={unit.id} value={unit.id}>
          {unit.name}
        </option>
      ))}
    </select>
  )
}

function NumInput({
  value,
  onChange,
  step,
  placeholder,
  emptyWhenZero,
}: {
  value: number
  onChange: (value: number) => void
  step: number
  placeholder?: string
  emptyWhenZero?: boolean
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min="0"
      step={step}
      value={emptyWhenZero && !value ? '' : value || ''}
      placeholder={placeholder ?? '0'}
      onChange={(e) => onChange(parseNum(e.target.value))}
    />
  )
}

function AddItemRow({
  categoryId,
  onAdd,
}: {
  categoryId: CategoryId
  onAdd: (categoryId: CategoryId, name: string, unit: Unit) => void
}) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<Unit>('kg')
  return (
    <form
      className="inv-add"
      onSubmit={(e) => {
        e.preventDefault()
        onAdd(categoryId, name, unit)
        setName('')
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="إضافة صنف جديد لهذا القسم"
        aria-label="اسم الصنف الجديد"
      />
      <UnitSelect value={unit} onChange={setUnit} />
      <button type="submit">إضافة</button>
    </form>
  )
}

export default InventoryApp
