import { useEffect, useState } from 'react'
import {
  ARABIC_DAYS,
  BRANCHES,
  CARD_FIELDS,
  CASH_FIELD,
  EXPENSE_FIELDS,
  RECORDED_SALES_FIELDS,
  calcBranchTotals,
  cardsTotal,
  collectionTotal,
  dateKey,
  daysInMonth,
  emptyExpenses,
  emptySales,
  formatMoney,
  monthLabel,
  recordedSalesTotal,
  shiftMonth,
  sumExpenseDay,
  sumSalesDay,
  surplusDeficit,
  type AppData,
  type BranchId,
  type ExpenseKey,
  type SalesKey,
} from './types'
import { loadData, saveData } from './storage'

type Tab = 'sales' | 'expenses' | 'summary'

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
    totalRecorded: wasitaTotals.totalRecorded + beirutTotals.totalRecorded,
    variance: wasitaTotals.variance + beirutTotals.variance,
    totalExpenses: wasitaTotals.totalExpenses + beirutTotals.totalExpenses,
    netProfit:
      wasitaTotals.totalSales +
      beirutTotals.totalSales -
      (wasitaTotals.totalExpenses + beirutTotals.totalExpenses),
  }
  const currentTotals = branch === 'wasita' ? wasitaTotals : beirutTotals
  const dayCollection = collectionTotal(sales)
  const dayCards = cardsTotal(sales)
  const dayRecorded = recordedSalesTotal(sales)
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
                ? `إجمالي التحصيل (كاش + البطاقات): ${formatMoney(dayCollection)}`
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

          <div className="sales-groups">
            <article className="sales-group">
              <h4>الكاش</h4>
              <label className="field">
                <span>{CASH_FIELD.label}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={sales.cash || ''}
                  placeholder="0"
                  onChange={(e) => updateSales('cash', parseNum(e.target.value))}
                />
              </label>
              <p className="group-subtotal">
                إجمالي الكاش: <b>{formatMoney(sales.cash)}</b>
              </p>
            </article>

            <article className="sales-group">
              <h4>البطاقات</h4>
              <div className="fields cards-fields">
                {CARD_FIELDS.map((field) => (
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
                إجمالي البطاقات: <b>{formatMoney(dayCards)}</b>
              </p>
            </article>
          </div>

          <div className="day-total-bar">
            <span>الإجمالي (الكاش + البطاقات)</span>
            <strong>{formatMoney(dayCollection)}</strong>
          </div>

          <article className="sales-group recorded-group">
            <h4>المبيعات المسجلة</h4>
            <div className="fields">
              {RECORDED_SALES_FIELDS.map((field) => (
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
            <div className="day-total-bar">
              <span>داخل المحل (الجهاز) + التطبيقات</span>
              <strong>{formatMoney(dayRecorded)}</strong>
            </div>
          </article>

          <div className={`variance-bar ${dayVariance > 0 ? 'surplus' : dayVariance < 0 ? 'deficit' : ''}`}>
            <div>
              <span>المقارنة: (الكاش + البطاقات) − (داخل المحل + التطبيقات)</span>
              <p>
                {dayVariance > 0
                  ? 'يوجد فائض'
                  : dayVariance < 0
                    ? 'يوجد عجز'
                    : 'لا يوجد فائض ولا عجز'}
              </p>
            </div>
            <strong>
              {dayVariance > 0 ? 'فائض ' : dayVariance < 0 ? 'عجز ' : ''}
              {formatMoney(Math.abs(dayVariance))}
            </strong>
          </div>

          <label className="field extra-field">
            <span>مشتريات اليوم من الصندوق (للمطابقة فقط)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={sales.todayPurchases || ''}
              placeholder="0"
              onChange={(e) => updateSales('todayPurchases', parseNum(e.target.value))}
            />
          </label>
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
                  <dt>الكاش</dt>
                  <dd>{formatMoney(wasitaTotals.totalCash)}</dd>
                </div>
                <div>
                  <dt>البطاقات</dt>
                  <dd>{formatMoney(wasitaTotals.totalCards)}</dd>
                </div>
                <div>
                  <dt>إجمالي التحصيل</dt>
                  <dd className="pos">{formatMoney(wasitaTotals.totalSales)}</dd>
                </div>
                <div>
                  <dt>المبيعات المسجلة</dt>
                  <dd>{formatMoney(wasitaTotals.totalRecorded)}</dd>
                </div>
                <div>
                  <dt>فائض / عجز</dt>
                  <dd className={wasitaTotals.variance >= 0 ? 'pos' : 'neg'}>
                    {wasitaTotals.variance > 0
                      ? `فائض ${formatMoney(wasitaTotals.variance)}`
                      : wasitaTotals.variance < 0
                        ? `عجز ${formatMoney(Math.abs(wasitaTotals.variance))}`
                        : formatMoney(0)}
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
                  <dt>الكاش</dt>
                  <dd>{formatMoney(beirutTotals.totalCash)}</dd>
                </div>
                <div>
                  <dt>البطاقات</dt>
                  <dd>{formatMoney(beirutTotals.totalCards)}</dd>
                </div>
                <div>
                  <dt>إجمالي التحصيل</dt>
                  <dd className="pos">{formatMoney(beirutTotals.totalSales)}</dd>
                </div>
                <div>
                  <dt>المبيعات المسجلة</dt>
                  <dd>{formatMoney(beirutTotals.totalRecorded)}</dd>
                </div>
                <div>
                  <dt>فائض / عجز</dt>
                  <dd className={beirutTotals.variance >= 0 ? 'pos' : 'neg'}>
                    {beirutTotals.variance > 0
                      ? `فائض ${formatMoney(beirutTotals.variance)}`
                      : beirutTotals.variance < 0
                        ? `عجز ${formatMoney(Math.abs(beirutTotals.variance))}`
                        : formatMoney(0)}
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
                  <dt>إجمالي التحصيل</dt>
                  <dd className="pos">{formatMoney(grand.totalSales)}</dd>
                </div>
                <div>
                  <dt>المبيعات المسجلة</dt>
                  <dd>{formatMoney(grand.totalRecorded)}</dd>
                </div>
                <div>
                  <dt>فائض / عجز</dt>
                  <dd className={grand.variance >= 0 ? 'pos' : 'neg'}>
                    {grand.variance > 0
                      ? `فائض ${formatMoney(grand.variance)}`
                      : grand.variance < 0
                        ? `عجز ${formatMoney(Math.abs(grand.variance))}`
                        : formatMoney(0)}
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
                  <th>التحصيل</th>
                  <th>المسجلة</th>
                  <th>فائض / عجز</th>
                  <th>المصروفات</th>
                  <th>الصافي</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                  const k = dateKey(year, month, day)
                  const collected = sumSalesDay(branchData.sales[k])
                  const recorded = recordedSalesTotal(branchData.sales[k])
                  const variance = surplusDeficit(branchData.sales[k])
                  const e = sumExpenseDay(branchData.expenses[k])
                  const net = collected - e
                  const wd = ARABIC_DAYS[new Date(year, month, day).getDay()]
                  return (
                    <tr key={day}>
                      <td>{day}</td>
                      <td>{wd}</td>
                      <td>{formatMoney(collected)}</td>
                      <td>{formatMoney(recorded)}</td>
                      <td className={variance > 0 ? 'pos' : variance < 0 ? 'neg' : ''}>
                        {variance > 0
                          ? `فائض ${formatMoney(variance)}`
                          : variance < 0
                            ? `عجز ${formatMoney(Math.abs(variance))}`
                            : formatMoney(0)}
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
                  <td>{formatMoney(currentTotals.totalSales)}</td>
                  <td>{formatMoney(currentTotals.totalRecorded)}</td>
                  <td className={currentTotals.variance >= 0 ? 'pos' : 'neg'}>
                    {currentTotals.variance > 0
                      ? `فائض ${formatMoney(currentTotals.variance)}`
                      : currentTotals.variance < 0
                        ? `عجز ${formatMoney(Math.abs(currentTotals.variance))}`
                        : formatMoney(0)}
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
