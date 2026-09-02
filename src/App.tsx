import { useEffect, useState } from 'react'
import {
  ARABIC_DAYS,
  BRANCHES,
  DETAIL_FIELDS,
  DEVICE_FIELD,
  EXPENSE_FIELDS,
  EXTRA_SALES_FIELDS,
  calcBranchTotals,
  dateKey,
  daysInMonth,
  emptyExpenses,
  emptySales,
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
  type ExpenseKey,
  type SalesKey,
} from './types'
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

  const updateExpense = (field: ExpenseKey, value: number) => {
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

  const wasitaTotals = calcBranchTotals(data.wasita, year, month)
  const beirutTotals = calcBranchTotals(data.beirut, year, month)
  const grand = {
    totalSales: wasitaTotals.totalSales + beirutTotals.totalSales,
    totalDevice: wasitaTotals.totalDevice + beirutTotals.totalDevice,
    totalInStore: wasitaTotals.totalInStore + beirutTotals.totalInStore,
    variance: wasitaTotals.variance + beirutTotals.variance,
    totalExpenses: wasitaTotals.totalExpenses + beirutTotals.totalExpenses,
    netProfit:
      wasitaTotals.totalSales +
      beirutTotals.totalSales -
      (wasitaTotals.totalExpenses + beirutTotals.totalExpenses),
  }
  const currentTotals = branch === 'wasita' ? wasitaTotals : beirutTotals
  const dayTill = tillTotal(sales)
  const dayInStore = inStoreSales(sales)
  const dayWithApps = totalWithApps(sales)
  const dayVariance = surplusDeficit(sales)
  const dayExpenseTotal = sumExpenseDay(expenses)

  const hasDayData = (day: number) => {
    const k = dateKey(year, month, day)
    const s = branchData.sales[k]
    const e = branchData.expenses[k]
    const salesFilled = s && Object.values(s).some((v) => v !== 0)
    const expFilled = e && Object.values(e).some((v) => v !== 0)
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
            <h1>شاورما — المحاسبة</h1>
            <p>فرع الوسيطاء وفرع بيروت</p>
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

      <section className="kpi-row" aria-label="ملخص سريع">
        <article className="kpi">
          <span>إجمالي المبيعات</span>
          <strong className="pos">{formatMoney(grand.totalSales)}</strong>
        </article>
        <article className="kpi">
          <span>إجمالي المصروفات</span>
          <strong className="neg">{formatMoney(grand.totalExpenses)}</strong>
        </article>
        <article className="kpi accent">
          <span>صافي الربح (الفرعين)</span>
          <strong className={grand.netProfit >= 0 ? 'pos' : 'neg'}>
            {formatMoney(grand.netProfit)}
          </strong>
        </article>
      </section>

      <nav className="branch-switch" aria-label="اختيار الفرع">
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
          <h3>إدخال مبيعات اليوم — {BRANCHES.find((b) => b.id === branch)?.name}</h3>

          <article className="sales-group">
            <h4>الجهاز</h4>
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
          </article>

          <article className="sales-group recorded-group">
            <h4>التفاصيل</h4>
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
              الكاش + صرافة 1 + فيزا 1 + هلا: <b>{formatMoney(dayTill)}</b>
            </p>
          </article>

          <article className="sales-group recorded-group">
            <h4>المشتريات والتطبيقات</h4>
            <div className="fields">
              {EXTRA_SALES_FIELDS.map((field) => (
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
            <span>المبيعات داخل المحل = الكاش + صرافة 1 + فيزا 1 + هلا − المشتريات</span>
            <strong>{formatMoney(dayInStore)}</strong>
          </div>
          <div className="day-total-bar">
            <span>إجمالي المبيعات مع التطبيقات = المبيعات داخل المحل + التطبيقات</span>
            <strong>{formatMoney(dayWithApps)}</strong>
          </div>

          <div className={`variance-bar ${dayVariance > 0 ? 'surplus' : dayVariance < 0 ? 'deficit' : ''}`}>
            <div>
              <span>الفائض أو العجز = إجمالي المبيعات مع التطبيقات − الجهاز</span>
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
          <h3>إدخال المشتريات والمصروفات — {BRANCHES.find((b) => b.id === branch)?.name}</h3>
          <div className="fields">
            {EXPENSE_FIELDS.map((field) => (
              <label key={field.key} className="field">
                <span>{field.label}</span>
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
        </section>
      )}

      {tab === 'summary' && (
        <section className="summary-section">
          <h3>التقرير الشهري — {currentMonthLabel}</h3>

          <div className="summary-grid">
            <article className="summary-card">
              <h4>فرع الوسيطاء</h4>
              <dl>
                <div>
                  <dt>الجهاز</dt>
                  <dd>{formatMoney(wasitaTotals.totalDevice)}</dd>
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
              </dl>
            </article>

            <article className="summary-card">
              <h4>فرع بيروت</h4>
              <dl>
                <div>
                  <dt>الجهاز</dt>
                  <dd>{formatMoney(beirutTotals.totalDevice)}</dd>
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
              </dl>
            </article>

            <article className="summary-card grand">
              <h4>الإجمالي الكلي (الفرعين)</h4>
              <dl>
                <div>
                  <dt>الجهاز</dt>
                  <dd>{formatMoney(grand.totalDevice)}</dd>
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
              </dl>
            </article>
          </div>

          <div className="month-table-wrap">
            <h4>تفصيل الأيام — {BRANCHES.find((b) => b.id === branch)?.name}</h4>
            <table className="month-table">
              <thead>
                <tr>
                  <th>اليوم</th>
                  <th>اليوم الأسبوعي</th>
                  <th>الجهاز</th>
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
                  const inStore = inStoreSales(row)
                  const withApps = sumSalesDay(row)
                  const variance = surplusDeficit(row)
                  const e = sumExpenseDay(branchData.expenses[k])
                  const net = withApps - e
                  const wd = ARABIC_DAYS[new Date(year, month, day).getDay()]
                  return (
                    <tr key={day}>
                      <td>{day}</td>
                      <td>{wd}</td>
                      <td>{formatMoney(device)}</td>
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
    </div>
  )
}

export default App
