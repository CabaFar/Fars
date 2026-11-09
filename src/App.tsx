import { useEffect, useState } from 'react'
import {
  ARABIC_DAYS,
  DETAIL_FIELDS,
  DEVICE_FIELD,
  EXTRA_SALES_FIELDS,
  calcBranchTotals,
  dateKey,
  daysInMonth,
  deviceNet,
  emptyExpenses,
  emptySales,
  expenseFieldList,
  expenseMonthTotals,
  formatMoney,
  inStoreSales,
  monthLabel,
  shiftMonth,
  sumExpenseDay,
  sumSalesDay,
  surplusDeficit,
  tillTotal,
  totalWithApps,
  type AppData,
  type BranchId,
  type ExpenseField,
  type SalesKey,
} from './types'
import { BackupBar } from './BackupBar'
import { branchLabel, getBrand, isSingleBranch, visibleBranches } from './brand'
import { loadData, saveData } from './storage'

type Tab = 'sales' | 'expenses' | 'summary'

function varianceText(value: number) {
  if (value > 0) return `فائض ${formatMoney(value)}`
  if (value < 0) return `عجز ${formatMoney(Math.abs(value))}`
  return formatMoney(0)
}

function todayParts() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() }
}

function App() {
  const now = todayParts()
  const [data, setData] = useState<AppData>(() => loadData())
  const [branch, setBranch] = useState<BranchId>('wasita')
  const [tab, setTab] = useState<Tab>('sales')
  const [year, setYear] = useState(now.year)
  const [month, setMonth] = useState(now.month)
  const [selectedDay, setSelectedDay] = useState(
    Math.min(now.day, daysInMonth(now.year, now.month)),
  )
  const [savedFlash, setSavedFlash] = useState(false)
  const [expenseEditor, setExpenseEditor] = useState<ExpenseField | 'add' | null>(null)

  const totalDays = daysInMonth(year, month)
  const key = dateKey(year, month, selectedDay)
  const weekday = ARABIC_DAYS[new Date(year, month, selectedDay).getDay()]
  const currentMonthLabel = monthLabel(year, month)
  const branchData = data[branch]
  const sales = branchData.sales[key] ?? emptySales()
  const expenses = branchData.expenses[key] ?? emptyExpenses()

  useEffect(() => {
    saveData(data)
    setSavedFlash(true)
    const t = window.setTimeout(() => setSavedFlash(false), 1200)
    return () => window.clearTimeout(t)
  }, [data])

  useEffect(() => {
    const max = daysInMonth(year, month)
    if (selectedDay > max) setSelectedDay(max)
  }, [year, month, selectedDay])

  const goMonth = (delta: number) => {
    const next = shiftMonth(year, month, delta)
    setYear(next.year)
    setMonth(next.month)
  }

  const goThisMonth = () => {
    const t = todayParts()
    setYear(t.year)
    setMonth(t.month)
    setSelectedDay(t.day)
  }

  const updateSales = (field: SalesKey, value: number) => {
    setData((prev) => ({
      ...prev,
      [branch]: {
        ...prev[branch],
        sales: {
          ...prev[branch].sales,
          [key]: {
            ...(prev[branch].sales[key] ?? emptySales()),
            [field]: value,
          },
        },
      },
    }))
  }

  const updateExpense = (field: string, value: number) => {
    setData((prev) => ({
      ...prev,
      [branch]: {
        ...prev[branch],
        expenses: {
          ...prev[branch].expenses,
          [key]: {
            ...(prev[branch].expenses[key] ?? emptyExpenses()),
            [field]: value,
          },
        },
      },
    }))
  }

  const parseNum = (raw: string) => {
    const n = Number(raw.replace(/,/g, ''))
    return Number.isFinite(n) ? n : 0
  }

  const saveExpenseField = (label: string, current: ExpenseField | 'add') => {
    const name = label.trim()
    if (!name) {
      window.alert('أدخل اسم البند')
      return
    }
    if (current === 'add') {
      setData((prev) => ({
        ...prev,
        extraExpenses: [...prev.extraExpenses, { id: `exp-${Date.now()}`, label: name }],
      }))
    } else if (current.custom) {
      setData((prev) => ({
        ...prev,
        extraExpenses: prev.extraExpenses.map((item) =>
          item.id === current.key ? { ...item, label: name } : item,
        ),
      }))
    } else {
      setData((prev) => ({
        ...prev,
        expenseLabels: { ...prev.expenseLabels, [current.key]: name },
      }))
    }
    setExpenseEditor(null)
  }

  const removeExpenseField = (field: ExpenseField) => {
    const ok = window.confirm(`حذف بند «${field.label}»؟`)
    if (!ok) return
    setData((prev) => {
      if (field.custom) {
        return {
          ...prev,
          extraExpenses: prev.extraExpenses.filter((item) => item.id !== field.key),
        }
      }
      const hidden = prev.hiddenExpenseKeys ?? []
      if (hidden.includes(field.key)) return prev
      return { ...prev, hiddenExpenseKeys: [...hidden, field.key] }
    })
    setExpenseEditor(null)
  }

  const expenseFields = expenseFieldList(data)
  const extras = data.extraExpenses
  const hiddenKeys = data.hiddenExpenseKeys ?? []
  const monthExpenseByItem = expenseMonthTotals(branchData.expenses, expenseFields, year, month)
  const wasitaExpenseByItem = expenseMonthTotals(data.wasita.expenses, expenseFields, year, month)
  const beirutExpenseByItem = expenseMonthTotals(data.beirut.expenses, expenseFields, year, month)
  const singleBranch = isSingleBranch()
  const deductPurchasesFromDevice = !singleBranch
  const wasitaTotals = calcBranchTotals(
    data.wasita,
    year,
    month,
    extras,
    hiddenKeys,
    deductPurchasesFromDevice,
  )
  const beirutTotals = calcBranchTotals(
    data.beirut,
    year,
    month,
    extras,
    hiddenKeys,
    deductPurchasesFromDevice,
  )
  const grand = {
    totalSales: wasitaTotals.totalSales + beirutTotals.totalSales,
    totalDevice: wasitaTotals.totalDevice + beirutTotals.totalDevice,
    totalCanceled: wasitaTotals.totalCanceled + beirutTotals.totalCanceled,
    totalAds: wasitaTotals.totalAds + beirutTotals.totalAds,
    totalInStore: wasitaTotals.totalInStore + beirutTotals.totalInStore,
    variance: wasitaTotals.variance + beirutTotals.variance,
    totalExpenses: wasitaTotals.totalExpenses + beirutTotals.totalExpenses,
    netProfit:
      wasitaTotals.totalSales +
      beirutTotals.totalSales -
      (wasitaTotals.totalExpenses + beirutTotals.totalExpenses),
    netProfitNoApps: wasitaTotals.netProfitNoApps + beirutTotals.netProfitNoApps,
  }
  const currentTotals = branch === 'wasita' ? wasitaTotals : beirutTotals
  const headlineTotals = singleBranch ? wasitaTotals : grand
  const currentBranchName = branchLabel(branch)
  const dayTill = tillTotal(sales)
  const dayInStore = inStoreSales(sales)
  const dayWithApps = totalWithApps(sales)
  const dayDeviceNet = deviceNet(sales, deductPurchasesFromDevice)
  const dayVariance = surplusDeficit(sales, deductPurchasesFromDevice)
  const dayExpenseTotal = sumExpenseDay(expenses, extras, hiddenKeys)

  const hasDayData = (day: number) => {
    const k = dateKey(year, month, day)
    const s = branchData.sales[k]
    const e = branchData.expenses[k]
    const salesFilled = s && Object.values(s).some((v) => Number(v) !== 0)
    const expFilled = e && expenseFields.some((field) => Number(e[field.key]) !== 0)
    return Boolean(salesFilled || expFilled)
  }

  return (
    <div className="app">
      <div className="bg-glow" aria-hidden />
      <div className="bg-grid" aria-hidden />

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <h1>{getBrand().name} — المحاسبة</h1>
            <p>{singleBranch ? 'فرع واحد' : 'فرع الوسيطاء وفرع بيروت'}</p>
          </div>
        </div>
        <nav className="site-nav" aria-label="صفحات النظام">
          <a className="current" href="./">
            المحاسبة
          </a>
          <a href="./cash.html">الكاش</a>
          <a href="./inventory.html">المخزون</a>
          <a href="./hr.html">الموارد البشرية</a>
        </nav>
        <div className={`save-pill ${savedFlash ? 'on' : ''}`}>
          {savedFlash ? 'تم الحفظ تلقائياً' : 'الحفظ تلقائي'}
        </div>
      </header>

      <BackupBar />

      <section className="acct-month" aria-label="الشهر">
        <button type="button" onClick={() => goMonth(-1)} aria-label="الشهر السابق">
          ›
        </button>
        <div>
          <h2>{currentMonthLabel}</h2>
          <p>كل شهر له مبيعات ومصروفات مستقلة</p>
        </div>
        <button type="button" onClick={() => goMonth(1)} aria-label="الشهر التالي">
          ‹
        </button>
        <button type="button" className="ghost" onClick={goThisMonth}>
          هذا الشهر
        </button>
      </section>

      <section className={`kpi-row${singleBranch ? '' : ' four'}`} aria-label="ملخص سريع">
        <article className="kpi">
          <span>إجمالي المبيعات</span>
          <strong className="pos">{formatMoney(headlineTotals.totalSales)}</strong>
        </article>
        <article className="kpi">
          <span>إجمالي المصروفات</span>
          <strong className="neg">{formatMoney(headlineTotals.totalExpenses)}</strong>
        </article>
        <article className="kpi accent">
          <span>{singleBranch ? 'صافي الربح' : 'صافي الربح (الفرعين)'}</span>
          <strong className={headlineTotals.netProfit >= 0 ? 'pos' : 'neg'}>
            {formatMoney(headlineTotals.netProfit)}
          </strong>
        </article>
        {!singleBranch && (
          <article className="kpi">
            <span>صافي الربح للفرعين بدون التطبيقات</span>
            <strong className={grand.netProfitNoApps >= 0 ? 'pos' : 'neg'}>
              {formatMoney(grand.netProfitNoApps)}
            </strong>
          </article>
        )}
      </section>

      {!singleBranch && (
      <nav className="branch-switch" aria-label="اختيار الفرع">
        {visibleBranches().map((b) => (
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
      )}

      {!singleBranch && (
      <div className="branch-mini">
        <span>
          مبيعات الفرع: <b>{formatMoney(currentTotals.totalSales)}</b>
        </span>
        <span>
          مصروفات الفرع: <b>{formatMoney(currentTotals.totalExpenses)}</b>
        </span>
        <span>
          صافي الفرع:{' '}
          <b className={currentTotals.netProfit >= 0 ? 'pos' : 'neg'}>
            {formatMoney(currentTotals.netProfit)}
          </b>
        </span>
      </div>
      )}

      <nav className="tabs" aria-label="الأقسام">
        <button
          type="button"
          className={tab === 'sales' ? 'active' : ''}
          onClick={() => setTab('sales')}
        >
          المبيعات اليومية
        </button>
        <button
          type="button"
          className={tab === 'expenses' ? 'active' : ''}
          onClick={() => setTab('expenses')}
        >
          المشتريات والمصروفات
        </button>
        <button
          type="button"
          className={tab === 'summary' ? 'active' : ''}
          onClick={() => setTab('summary')}
        >
          التقرير الشهري
        </button>
      </nav>

      {tab !== 'summary' && (
        <div className="day-panel">
          <div className="day-head">
            <h2>
              يوم {selectedDay} — {weekday} · {currentMonthLabel}
            </h2>
            <p>
              {tab === 'sales'
                ? `إجمالي المبيعات مع التطبيقات: ${formatMoney(dayWithApps)}`
                : `إجمالي مصروفات اليوم: ${formatMoney(dayExpenseTotal)}`}
            </p>
          </div>
          <div className="day-grid" role="listbox" aria-label="أيام الشهر">
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
              const isToday = day === now.day && month === now.month && year === now.year
              return (
                <button
                  key={day}
                  type="button"
                  role="option"
                  aria-selected={selectedDay === day}
                  className={[
                    'day-btn',
                    selectedDay === day ? 'selected' : '',
                    hasDayData(day) ? 'filled' : '',
                    isToday ? 'today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setSelectedDay(day)}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'sales' && (
        <section className="form-section">
          <h3>
            إدخال مبيعات اليوم{singleBranch ? '' : ` — ${currentBranchName}`}
          </h3>

          <article className="sales-group">
            <h4>الجهاز</h4>
            <div className="fields">
              <label className="field">
                <span>{DEVICE_FIELD.label} (إجمالي المبيعات في الجهاز)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={sales.device || ''}
                  placeholder="0"
                  onChange={(e) => updateSales('device', parseNum(e.target.value))}
                />
              </label>
              <label className="field">
                <span>الفواتير الملغاة</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={sales.canceledInvoices || ''}
                  placeholder="0"
                  onChange={(e) => updateSales('canceledInvoices', parseNum(e.target.value))}
                />
              </label>
              <label className="field">
                <span>الإعلانات</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={sales.ads || ''}
                  placeholder="0"
                  onChange={(e) => updateSales('ads', parseNum(e.target.value))}
                />
              </label>
              {deductPurchasesFromDevice && (
                <label className="field">
                  <span>المشتريات</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={sales.todayPurchases || ''}
                    placeholder="0"
                    onChange={(e) => updateSales('todayPurchases', parseNum(e.target.value))}
                  />
                </label>
              )}
            </div>
            <p className="group-subtotal">
              {deductPurchasesFromDevice
                ? 'صافي الجهاز = الجهاز − الفواتير الملغاة − الإعلانات − المشتريات: '
                : 'صافي الجهاز = الجهاز − الفواتير الملغاة − الإعلانات: '}
              <b>{formatMoney(dayDeviceNet)}</b>
            </p>
          </article>

          <article className="sales-group recorded-group">
            <h4>المبيعات داخل المحل</h4>
            <div className="fields">
              {DETAIL_FIELDS.map((field) => (
                <label key={field.key} className="field">
                  <span>{field.label}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={sales[field.key] || ''}
                    placeholder="0"
                    onChange={(e) => updateSales(field.key, parseNum(e.target.value))}
                  />
                </label>
              ))}
            </div>
            <p className="group-subtotal">
              الكاش + صرافة 1 + فيزا 1 + هلا + تحويل: <b>{formatMoney(dayTill)}</b>
            </p>
          </article>

          <article className="sales-group recorded-group">
            <h4>{deductPurchasesFromDevice ? 'التطبيقات' : 'المشتريات والتطبيقات'}</h4>
            <div className="fields">
              {EXTRA_SALES_FIELDS.filter(
                (field) => !(deductPurchasesFromDevice && field.key === 'todayPurchases'),
              ).map((field) => (
                <label key={field.key} className="field">
                  <span>{field.label}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={sales[field.key] || ''}
                    placeholder="0"
                    onChange={(e) => updateSales(field.key, parseNum(e.target.value))}
                  />
                </label>
              ))}
            </div>
          </article>

          <div className="day-total-bar">
            <span>المبيعات داخل المحل = الكاش + صرافة 1 + فيزا 1 + هلا + تحويل</span>
            <strong>{formatMoney(dayInStore)}</strong>
          </div>
          <div className="day-total-bar">
            <span>إجمالي المبيعات مع التطبيقات = المبيعات داخل المحل + التطبيقات − المشتريات</span>
            <strong>{formatMoney(dayWithApps)}</strong>
          </div>

          <div className={`variance-bar ${dayVariance > 0 ? 'surplus' : dayVariance < 0 ? 'deficit' : ''}`}>
            <div>
              <span>الفائض أو العجز = إجمالي المبيعات مع التطبيقات − صافي الجهاز</span>
              <p>
                {dayVariance > 0
                  ? 'يوجد فائض'
                  : dayVariance < 0
                    ? 'يوجد عجز'
                    : 'لا يوجد فائض ولا عجز'}
              </p>
            </div>
            <strong>{varianceText(dayVariance)}</strong>
          </div>
        </section>
      )}

      {tab === 'expenses' && (
        <section className="form-section">
          <div className="expense-head">
            <h3>
              إدخال المشتريات والمصروفات{singleBranch ? '' : ` — ${currentBranchName}`}
            </h3>
            <button type="button" className="icon-add" onClick={() => setExpenseEditor('add')}>
              <PlusIcon />
              إضافة بند
            </button>
          </div>
          <div className="fields">
            {expenseFields.map((field) => (
              <label key={field.key} className="field expense-field">
                <span className="field-label-row">
                  <span className="field-name">{field.label}</span>
                  <span className="field-actions">
                    <button
                      type="button"
                      className="icon-edit"
                      aria-label={`تعديل ${field.label}`}
                      onClick={(e) => {
                        e.preventDefault()
                        setExpenseEditor(field)
                      }}
                    >
                      <EditIcon />
                    </button>
                    {!singleBranch && (
                      <button
                        type="button"
                        className="icon-edit icon-delete"
                        aria-label={`حذف ${field.label}`}
                        onClick={(e) => {
                          e.preventDefault()
                          removeExpenseField(field)
                        }}
                      >
                        <DeleteIcon />
                      </button>
                    )}
                  </span>
                </span>
                <span className="field-month-total">
                  إجمالي الشهر: {formatMoney(monthExpenseByItem[field.key] || 0)}
                  {!singleBranch && (
                    <>
                      {' '}
                      · الفرعين:{' '}
                      {formatMoney(
                        (wasitaExpenseByItem[field.key] || 0) + (beirutExpenseByItem[field.key] || 0),
                      )}
                    </>
                  )}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={expenses[field.key] || ''}
                  placeholder="0"
                  onChange={(e) => updateExpense(field.key, parseNum(e.target.value))}
                />
              </label>
            ))}
          </div>
          <div className="day-total-bar">
            <span>إجمالي مصروفات هذا اليوم</span>
            <strong>{formatMoney(dayExpenseTotal)}</strong>
          </div>
          <div className="expense-month-panel">
            <h4>
              {singleBranch
                ? `إجمالي كل صنف خلال ${currentMonthLabel}`
                : `إجمالي كل صنف للفرعين خلال ${currentMonthLabel}`}
            </h4>
            {singleBranch ? (
              <ul>
                {expenseFields.map((field) => (
                  <li key={field.key}>
                    <span>{field.label}</span>
                    <strong>{formatMoney(monthExpenseByItem[field.key] || 0)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="expense-both-wrap">
                <table className="expense-both-table">
                  <thead>
                    <tr>
                      <th>الصنف</th>
                      <th>الوسيطاء</th>
                      <th>بيروت</th>
                      <th>الفرعين</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseFields.map((field) => {
                      const wasitaAmt = wasitaExpenseByItem[field.key] || 0
                      const beirutAmt = beirutExpenseByItem[field.key] || 0
                      return (
                        <tr key={field.key}>
                          <td>{field.label}</td>
                          <td>{formatMoney(wasitaAmt)}</td>
                          <td>{formatMoney(beirutAmt)}</td>
                          <td>
                            <strong>{formatMoney(wasitaAmt + beirutAmt)}</strong>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="expense-month-grand">
              <span>{singleBranch ? 'إجمالي المصروفات' : 'إجمالي المصروفات للفرعين'}</span>
              <strong>
                {formatMoney(singleBranch ? currentTotals.totalExpenses : grand.totalExpenses)}
              </strong>
            </div>
          </div>
        </section>
      )}

      {tab === 'summary' && (
        <section className="summary-section">
          <h3>التقرير الشهري — {currentMonthLabel}</h3>

          <div className={`summary-grid${singleBranch ? ' single' : ''}`}>
            <article className={`summary-card${singleBranch ? ' grand' : ''}`}>
              <h4>{singleBranch ? getBrand().name : 'فرع الوسيطاء'}</h4>
              <dl>
                <div>
                  <dt>صافي الجهاز</dt>
                  <dd>{formatMoney(wasitaTotals.totalDevice)}</dd>
                </div>
                <div>
                  <dt>الفواتير الملغاة</dt>
                  <dd>{formatMoney(wasitaTotals.totalCanceled)}</dd>
                </div>
                <div>
                  <dt>الإعلانات</dt>
                  <dd>{formatMoney(wasitaTotals.totalAds)}</dd>
                </div>
                <div>
                  <dt>المبيعات داخل المحل</dt>
                  <dd>{formatMoney(wasitaTotals.totalInStore)}</dd>
                </div>
                <div>
                  <dt>إجمالي المبيعات مع التطبيقات</dt>
                  <dd className="pos">{formatMoney(wasitaTotals.totalSales)}</dd>
                </div>
                <div>
                  <dt>فائض / عجز</dt>
                  <dd className={wasitaTotals.variance >= 0 ? 'pos' : 'neg'}>
                    {varianceText(wasitaTotals.variance)}
                  </dd>
                </div>
                <div>
                  <dt>إجمالي المصروفات</dt>
                  <dd className="neg">{formatMoney(wasitaTotals.totalExpenses)}</dd>
                </div>
                <div>
                  <dt>صافي الربح</dt>
                  <dd className={wasitaTotals.netProfit >= 0 ? 'pos' : 'neg'}>
                    {formatMoney(wasitaTotals.netProfit)}
                  </dd>
                </div>
                {!singleBranch && (
                  <div>
                    <dt>صافي الربح بدون التطبيقات</dt>
                    <dd className={wasitaTotals.netProfitNoApps >= 0 ? 'pos' : 'neg'}>
                      {formatMoney(wasitaTotals.netProfitNoApps)}
                    </dd>
                  </div>
                )}
              </dl>
            </article>

            {!singleBranch && (
            <article className="summary-card">
              <h4>فرع بيروت</h4>
              <dl>
                <div>
                  <dt>صافي الجهاز</dt>
                  <dd>{formatMoney(beirutTotals.totalDevice)}</dd>
                </div>
                <div>
                  <dt>الفواتير الملغاة</dt>
                  <dd>{formatMoney(beirutTotals.totalCanceled)}</dd>
                </div>
                <div>
                  <dt>الإعلانات</dt>
                  <dd>{formatMoney(beirutTotals.totalAds)}</dd>
                </div>
                <div>
                  <dt>المبيعات داخل المحل</dt>
                  <dd>{formatMoney(beirutTotals.totalInStore)}</dd>
                </div>
                <div>
                  <dt>إجمالي المبيعات مع التطبيقات</dt>
                  <dd className="pos">{formatMoney(beirutTotals.totalSales)}</dd>
                </div>
                <div>
                  <dt>فائض / عجز</dt>
                  <dd className={beirutTotals.variance >= 0 ? 'pos' : 'neg'}>
                    {varianceText(beirutTotals.variance)}
                  </dd>
                </div>
                <div>
                  <dt>إجمالي المصروفات</dt>
                  <dd className="neg">{formatMoney(beirutTotals.totalExpenses)}</dd>
                </div>
                <div>
                  <dt>صافي الربح</dt>
                  <dd className={beirutTotals.netProfit >= 0 ? 'pos' : 'neg'}>
                    {formatMoney(beirutTotals.netProfit)}
                  </dd>
                </div>
                <div>
                  <dt>صافي الربح بدون التطبيقات</dt>
                  <dd className={beirutTotals.netProfitNoApps >= 0 ? 'pos' : 'neg'}>
                    {formatMoney(beirutTotals.netProfitNoApps)}
                  </dd>
                </div>
              </dl>
            </article>
            )}

            {!singleBranch && (
            <article className="summary-card grand">
              <h4>الإجمالي الكلي (الفرعين)</h4>
              <dl>
                <div>
                  <dt>صافي الجهاز</dt>
                  <dd>{formatMoney(grand.totalDevice)}</dd>
                </div>
                <div>
                  <dt>الفواتير الملغاة</dt>
                  <dd>{formatMoney(grand.totalCanceled)}</dd>
                </div>
                <div>
                  <dt>الإعلانات</dt>
                  <dd>{formatMoney(grand.totalAds)}</dd>
                </div>
                <div>
                  <dt>المبيعات داخل المحل</dt>
                  <dd>{formatMoney(grand.totalInStore)}</dd>
                </div>
                <div>
                  <dt>إجمالي المبيعات مع التطبيقات</dt>
                  <dd className="pos">{formatMoney(grand.totalSales)}</dd>
                </div>
                <div>
                  <dt>فائض / عجز</dt>
                  <dd className={grand.variance >= 0 ? 'pos' : 'neg'}>
                    {varianceText(grand.variance)}
                  </dd>
                </div>
                <div>
                  <dt>إجمالي المصروفات</dt>
                  <dd className="neg">{formatMoney(grand.totalExpenses)}</dd>
                </div>
                <div>
                  <dt>صافي الربح</dt>
                  <dd className={grand.netProfit >= 0 ? 'pos' : 'neg'}>
                    {formatMoney(grand.netProfit)}
                  </dd>
                </div>
                <div>
                  <dt>صافي الربح بدون التطبيقات</dt>
                  <dd className={grand.netProfitNoApps >= 0 ? 'pos' : 'neg'}>
                    {formatMoney(grand.netProfitNoApps)}
                  </dd>
                </div>
              </dl>
            </article>
            )}
          </div>

          <div className="month-table-wrap">
            <h4>تفصيل الأيام{singleBranch ? '' : ` — ${currentBranchName}`}</h4>
            <table className="month-table">
              <thead>
                <tr>
                  <th>اليوم</th>
                  <th>اليوم الأسبوعي</th>
                  <th>الجهاز</th>
                  <th>ملغاة</th>
                  <th>إعلانات</th>
                  {deductPurchasesFromDevice && <th>مشتريات</th>}
                  <th>صافي الجهاز</th>
                  <th>داخل المحل</th>
                  <th>مع التطبيقات</th>
                  <th>فائض / عجز</th>
                  <th>المصروفات</th>
                  <th>الصافي</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                  const k = dateKey(year, month, day)
                  const row = branchData.sales[k]
                  const device = row?.device || 0
                  const canceled = row?.canceledInvoices || 0
                  const ads = row?.ads || 0
                  const purchases = row?.todayPurchases || 0
                  const netDevice = deviceNet(row, deductPurchasesFromDevice)
                  const inStore = inStoreSales(row)
                  const withApps = sumSalesDay(row)
                  const variance = surplusDeficit(row, deductPurchasesFromDevice)
                  const e = sumExpenseDay(branchData.expenses[k], extras, hiddenKeys)
                  const net = withApps - e
                  const wd = ARABIC_DAYS[new Date(year, month, day).getDay()]
                  return (
                    <tr key={day}>
                      <td>{day}</td>
                      <td>{wd}</td>
                      <td>{formatMoney(device)}</td>
                      <td>{formatMoney(canceled)}</td>
                      <td>{formatMoney(ads)}</td>
                      {deductPurchasesFromDevice && <td>{formatMoney(purchases)}</td>}
                      <td>{formatMoney(netDevice)}</td>
                      <td>{formatMoney(inStore)}</td>
                      <td>{formatMoney(withApps)}</td>
                      <td className={variance > 0 ? 'pos' : variance < 0 ? 'neg' : ''}>
                        {varianceText(variance)}
                      </td>
                      <td>{formatMoney(e)}</td>
                      <td className={net >= 0 ? 'pos' : 'neg'}>{formatMoney(net)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>المجموع</td>
                  <td>
                    {formatMoney(
                      currentTotals.totalDevice +
                        currentTotals.totalCanceled +
                        currentTotals.totalAds +
                        (deductPurchasesFromDevice ? currentTotals.totalPurchases : 0),
                    )}
                  </td>
                  <td>{formatMoney(currentTotals.totalCanceled)}</td>
                  <td>{formatMoney(currentTotals.totalAds)}</td>
                  {deductPurchasesFromDevice && <td>{formatMoney(currentTotals.totalPurchases)}</td>}
                  <td>{formatMoney(currentTotals.totalDevice)}</td>
                  <td>{formatMoney(currentTotals.totalInStore)}</td>
                  <td>{formatMoney(currentTotals.totalSales)}</td>
                  <td className={currentTotals.variance >= 0 ? 'pos' : 'neg'}>
                    {varianceText(currentTotals.variance)}
                  </td>
                  <td>{formatMoney(currentTotals.totalExpenses)}</td>
                  <td className={currentTotals.netProfit >= 0 ? 'pos' : 'neg'}>
                    {formatMoney(currentTotals.netProfit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      <footer className="footer">
        البيانات تُحفظ على هذا الجهاز · {currentMonthLabel}
      </footer>

      {expenseEditor && (
        <ExpenseFieldDialog
          field={expenseEditor}
          onCancel={() => setExpenseEditor(null)}
          onSave={saveExpenseField}
          onDelete={removeExpenseField}
        />
      )}
    </div>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        fill="currentColor"
        d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
      />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
      />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
      <path
        fill="currentColor"
        d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
      />
    </svg>
  )
}

function ExpenseFieldDialog({
  field,
  onCancel,
  onSave,
  onDelete,
}: {
  field: ExpenseField | 'add'
  onCancel: () => void
  onSave: (label: string, current: ExpenseField | 'add') => void
  onDelete: (field: ExpenseField) => void
}) {
  const isAdd = field === 'add'
  const [label, setLabel] = useState(isAdd ? '' : field.label)

  return (
    <div className="acct-modal-backdrop" role="presentation" onClick={onCancel}>
      <form
        className="acct-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-field-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          onSave(label, field)
        }}
      >
        <h3 id="expense-field-title">{isAdd ? 'إضافة بند' : 'تعديل البند'}</h3>
        <label className="field">
          <span>اسم البند</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="مثال: صيانة، أكياس، مياه..."
            autoFocus
          />
        </label>
        <div className="acct-modal-actions">
          {!isAdd && field.custom && (
            <button type="button" className="danger" onClick={() => onDelete(field)}>
              حذف
            </button>
          )}
          <button type="button" className="ghost" onClick={onCancel}>
            إلغاء
          </button>
          <button type="submit">{isAdd ? 'إضافة' : 'حفظ'}</button>
        </div>
      </form>
    </div>
  )
}

export default App
