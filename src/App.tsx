import { useEffect, useState } from 'react'
import {
  ARABIC_DAYS,
  BRANCHES,
  EXPENSE_FIELDS,
  MONTH,
  SALES_FIELDS,
  YEAR,
  calcBranchTotals,
  dateKey,
  daysInMonth,
  emptyExpenses,
  emptySales,
  formatMoney,
  sumCashMonth,
  sumCashExpensesMonth,
  sumExpenseDay,
  sumSalesDay,
  type AppData,
  type BranchId,
  type ExpenseKey,
  type SalesKey,
} from './types'
import { loadData, saveData } from './storage'

type Tab = 'cash' | 'sales' | 'expenses' | 'summary'

function App() {
  const [data, setData] = useState<AppData>(() => loadData())
  const [branch, setBranch] = useState<BranchId>('wasita')
  const [tab, setTab] = useState<Tab>('cash')
  const [selectedDay, setSelectedDay] = useState(1)
  const [savedFlash, setSavedFlash] = useState(false)

  const totalDays = daysInMonth(YEAR, MONTH)
  const key = dateKey(selectedDay)
  const weekday = ARABIC_DAYS[new Date(YEAR, MONTH, selectedDay).getDay()]
  const branchData = data[branch]
  const sales = branchData.sales[key] ?? emptySales()
  const expenses = branchData.expenses[key] ?? emptyExpenses()

  useEffect(() => {
    saveData(data)
    setSavedFlash(true)
    const t = window.setTimeout(() => setSavedFlash(false), 1200)
    return () => window.clearTimeout(t)
  }, [data])

  const updateSalesFor = (branchId: BranchId, field: SalesKey, value: number) => {
    setData((prev) => ({
      ...prev,
      [branchId]: {
        ...prev[branchId],
        sales: {
          ...prev[branchId].sales,
          [key]: {
            ...(prev[branchId].sales[key] ?? emptySales()),
            [field]: value,
          },
        },
      },
    }))
  }

  const updateSales = (field: SalesKey, value: number) => {
    updateSalesFor(branch, field, value)
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

  const wasitaTotals = calcBranchTotals(data.wasita)
  const beirutTotals = calcBranchTotals(data.beirut)
  const grand = {
    totalSales: wasitaTotals.totalSales + beirutTotals.totalSales,
    totalExpenses: wasitaTotals.totalExpenses + beirutTotals.totalExpenses,
    netProfit:
      wasitaTotals.totalSales +
      beirutTotals.totalSales -
      (wasitaTotals.totalExpenses + beirutTotals.totalExpenses),
  }
  const currentTotals = branch === 'wasita' ? wasitaTotals : beirutTotals
  const daySalesTotal = sumSalesDay(sales)
  const dayExpenseTotal = sumExpenseDay(expenses)
  const branchCashTotal = sumCashMonth(branchData)
  const wasitaCashTotal = sumCashMonth(data.wasita)
  const beirutCashTotal = sumCashMonth(data.beirut)
  const grandCashTotal = wasitaCashTotal + beirutCashTotal
  const wasitaCashExpenseTotal = sumCashExpensesMonth(data.wasita)
  const beirutCashExpenseTotal = sumCashExpensesMonth(data.beirut)
  const grandCashExpenseTotal = wasitaCashExpenseTotal + beirutCashExpenseTotal
  const wasitaDayCash = data.wasita.sales[key]?.cash || 0
  const beirutDayCash = data.beirut.sales[key]?.cash || 0
  const wasitaDayCashExpense = data.wasita.sales[key]?.todayPurchases || 0
  const beirutDayCashExpense = data.beirut.sales[key]?.todayPurchases || 0
  const bothBranchesDayCash = wasitaDayCash + beirutDayCash
  const bothBranchesDayCashExpense = wasitaDayCashExpense + beirutDayCashExpense
  const wasitaDayNetCash = wasitaDayCash - wasitaDayCashExpense
  const beirutDayNetCash = beirutDayCash - beirutDayCashExpense
  const bothBranchesDayNetCash = wasitaDayNetCash + beirutDayNetCash
  const wasitaNetCashTotal = wasitaCashTotal - wasitaCashExpenseTotal
  const beirutNetCashTotal = beirutCashTotal - beirutCashExpenseTotal
  const grandNetCashTotal = grandCashTotal - grandCashExpenseTotal

  const hasDayData = (day: number) => {
    const k = dateKey(day)
    if (tab === 'cash') {
      const wasita = data.wasita.sales[k]
      const beirut = data.beirut.sales[k]
      return Boolean(
        (wasita && (wasita.cash !== 0 || wasita.todayPurchases !== 0)) ||
          (beirut && (beirut.cash !== 0 || beirut.todayPurchases !== 0)),
      )
    }
    const s = branchData.sales[k]
    const e = branchData.expenses[k]
    const salesFilled = s && Object.values(s).some((v) => v !== 0)
    const expFilled = e && Object.values(e).some((v) => v !== 0)
    return Boolean(salesFilled || expFilled)
  }

  const dayHeadHint =
    tab === 'cash'
      ? `صافي كاش الفرعين اليوم: ${formatMoney(bothBranchesDayNetCash)}`
      : tab === 'sales'
        ? `إجمالي مبيعات اليوم: ${formatMoney(daySalesTotal)}`
        : `إجمالي مصروفات اليوم: ${formatMoney(dayExpenseTotal)}`

  return (
    <div className="app">
      <div className="bg-glow" aria-hidden />
      <div className="bg-grid" aria-hidden />

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <h1>شاورما — المحاسبة</h1>
            <p>أغسطس {YEAR} · من 1 السبت حتى 31</p>
          </div>
        </div>
        <div className={`save-pill ${savedFlash ? 'on' : ''}`}>
          {savedFlash ? 'تم الحفظ تلقائياً' : 'الحفظ تلقائي'}
        </div>
      </header>

      <section className="kpi-row" aria-label="ملخص سريع">
        <article className="kpi">
          <span>كاش الوسيطاء</span>
          <strong className="pos">{formatMoney(wasitaCashTotal)}</strong>
        </article>
        <article className="kpi">
          <span>كاش بيروت</span>
          <strong className="pos">{formatMoney(beirutCashTotal)}</strong>
        </article>
        <article className="kpi">
          <span>مصروفات الكاش (الفرعين)</span>
          <strong className="neg">{formatMoney(grandCashExpenseTotal)}</strong>
        </article>
        <article className="kpi accent">
          <span>صافي الكاش (الفرعين)</span>
          <strong className={grandNetCashTotal >= 0 ? 'pos' : 'neg'}>
            {formatMoney(grandNetCashTotal)}
          </strong>
        </article>
      </section>

      {tab !== 'cash' && (
        <>
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
              كاش الفرع: <b className="pos">{formatMoney(branchCashTotal)}</b>
            </span>
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
        </>
      )}

      <nav className="tabs" aria-label="الأقسام">
        <button
          type="button"
          className={tab === 'cash' ? 'active' : ''}
          onClick={() => setTab('cash')}
        >
          الكاش اليومي
        </button>
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
              يوم {selectedDay} أغسطس — {weekday}
            </h2>
            <p>{dayHeadHint}</p>
          </div>
          <div className="day-grid" role="listbox" aria-label="أيام أغسطس">
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                type="button"
                role="option"
                aria-selected={selectedDay === day}
                className={[
                  'day-btn',
                  selectedDay === day ? 'selected' : '',
                  hasDayData(day) ? 'filled' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setSelectedDay(day)}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'cash' && (
        <section className="form-section cash-section">
          <h3>تسجيل الكاش اليومي — فرع الوسيطاء وفرع بيروت</h3>
          <p className="cash-lead">
            أدخل الكاش ومصروفات الكاش لكل فرع يومياً من 1 إلى {totalDays} أغسطس {YEAR}. الحفظ تلقائي.
          </p>

          <div className="cash-branch-cards">
            <article className="cash-branch-card">
              <h4>فرع الوسيطاء</h4>
              <div className="cash-branch-fields">
                <label className="field cash-field">
                  <span>الكاش النقدي — يوم {selectedDay}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={wasitaDayCash || ''}
                    placeholder="0"
                    autoFocus
                    onChange={(e) => updateSalesFor('wasita', 'cash', parseNum(e.target.value))}
                  />
                </label>
                <label className="field cash-field cash-expense-field">
                  <span>مصروفات من الكاش — يوم {selectedDay}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={wasitaDayCashExpense || ''}
                    placeholder="0"
                    onChange={(e) =>
                      updateSalesFor('wasita', 'todayPurchases', parseNum(e.target.value))
                    }
                  />
                </label>
              </div>
              <div className="day-total-bar cash-net-bar">
                <span>صافي كاش الوسيطاء اليوم</span>
                <strong className={wasitaDayNetCash >= 0 ? 'pos' : 'neg'}>
                  {formatMoney(wasitaDayNetCash)}
                </strong>
              </div>
            </article>

            <article className="cash-branch-card">
              <h4>فرع بيروت</h4>
              <div className="cash-branch-fields">
                <label className="field cash-field">
                  <span>الكاش النقدي — يوم {selectedDay}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={beirutDayCash || ''}
                    placeholder="0"
                    onChange={(e) => updateSalesFor('beirut', 'cash', parseNum(e.target.value))}
                  />
                </label>
                <label className="field cash-field cash-expense-field">
                  <span>مصروفات من الكاش — يوم {selectedDay}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={beirutDayCashExpense || ''}
                    placeholder="0"
                    onChange={(e) =>
                      updateSalesFor('beirut', 'todayPurchases', parseNum(e.target.value))
                    }
                  />
                </label>
              </div>
              <div className="day-total-bar cash-net-bar">
                <span>صافي كاش بيروت اليوم</span>
                <strong className={beirutDayNetCash >= 0 ? 'pos' : 'neg'}>
                  {formatMoney(beirutDayNetCash)}
                </strong>
              </div>
            </article>
          </div>

          <div className="cash-day-totals">
            <div className="day-total-bar">
              <span>كاش الفرعين اليوم</span>
              <strong>{formatMoney(bothBranchesDayCash)}</strong>
            </div>
            <div className="day-total-bar">
              <span>مصروفات الكاش اليوم</span>
              <strong className="neg">{formatMoney(bothBranchesDayCashExpense)}</strong>
            </div>
            <div className="day-total-bar cash-month-bar">
              <span>صافي الفرعين اليوم</span>
              <strong className={bothBranchesDayNetCash >= 0 ? 'pos' : 'neg'}>
                {formatMoney(bothBranchesDayNetCash)}
              </strong>
            </div>
          </div>

          <div className="cash-month-summary">
            <div className="day-total-bar">
              <span>إجمالي كاش الوسيطاء</span>
              <strong>{formatMoney(wasitaCashTotal)}</strong>
            </div>
            <div className="day-total-bar">
              <span>مصروف كاش الوسيطاء</span>
              <strong className="neg">{formatMoney(wasitaCashExpenseTotal)}</strong>
            </div>
            <div className="day-total-bar">
              <span>صافي كاش الوسيطاء</span>
              <strong className={wasitaNetCashTotal >= 0 ? 'pos' : 'neg'}>
                {formatMoney(wasitaNetCashTotal)}
              </strong>
            </div>
            <div className="day-total-bar">
              <span>إجمالي كاش بيروت</span>
              <strong>{formatMoney(beirutCashTotal)}</strong>
            </div>
            <div className="day-total-bar">
              <span>مصروف كاش بيروت</span>
              <strong className="neg">{formatMoney(beirutCashExpenseTotal)}</strong>
            </div>
            <div className="day-total-bar">
              <span>صافي كاش بيروت</span>
              <strong className={beirutNetCashTotal >= 0 ? 'pos' : 'neg'}>
                {formatMoney(beirutNetCashTotal)}
              </strong>
            </div>
            <div className="day-total-bar cash-month-bar cash-month-grand">
              <span>صافي كاش الفرعين (أغسطس)</span>
              <strong className={grandNetCashTotal >= 0 ? 'pos' : 'neg'}>
                {formatMoney(grandNetCashTotal)}
              </strong>
            </div>
          </div>

          <div className="month-table-wrap cash-table-wrap">
            <h4>سجل الكاش والمصروفات اليومية — أغسطس {YEAR}</h4>
            <table className="month-table">
              <thead>
                <tr>
                  <th>اليوم</th>
                  <th>اليوم الأسبوعي</th>
                  <th>كاش الوسيطاء</th>
                  <th>مصروف الوسيطاء</th>
                  <th>كاش بيروت</th>
                  <th>مصروف بيروت</th>
                  <th>صافي الفرعين</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                  const k = dateKey(day)
                  const wasitaCash = data.wasita.sales[k]?.cash || 0
                  const wasitaExpense = data.wasita.sales[k]?.todayPurchases || 0
                  const beirutCash = data.beirut.sales[k]?.cash || 0
                  const beirutExpense = data.beirut.sales[k]?.todayPurchases || 0
                  const dayNet = wasitaCash + beirutCash - wasitaExpense - beirutExpense
                  const wd = ARABIC_DAYS[new Date(YEAR, MONTH, day).getDay()]
                  return (
                    <tr
                      key={day}
                      className={selectedDay === day ? 'row-selected' : ''}
                      onClick={() => setSelectedDay(day)}
                    >
                      <td>{day}</td>
                      <td>{wd}</td>
                      <td className={wasitaCash > 0 ? 'pos' : ''}>{formatMoney(wasitaCash)}</td>
                      <td className={wasitaExpense > 0 ? 'neg' : ''}>
                        {formatMoney(wasitaExpense)}
                      </td>
                      <td className={beirutCash > 0 ? 'pos' : ''}>{formatMoney(beirutCash)}</td>
                      <td className={beirutExpense > 0 ? 'neg' : ''}>
                        {formatMoney(beirutExpense)}
                      </td>
                      <td className={dayNet >= 0 ? 'pos' : 'neg'}>{formatMoney(dayNet)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>المجموع الشهري</td>
                  <td>{formatMoney(wasitaCashTotal)}</td>
                  <td>{formatMoney(wasitaCashExpenseTotal)}</td>
                  <td>{formatMoney(beirutCashTotal)}</td>
                  <td>{formatMoney(beirutCashExpenseTotal)}</td>
                  <td className={grandNetCashTotal >= 0 ? 'pos' : 'neg'}>
                    {formatMoney(grandNetCashTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {tab === 'sales' && (
        <section className="form-section">
          <h3>إدخال مبيعات اليوم — {BRANCHES.find((b) => b.id === branch)?.name}</h3>
          <div className="fields">
            {SALES_FIELDS.map((field) => (
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
            <span>إجمالي مبيعات هذا اليوم</span>
            <strong>{formatMoney(daySalesTotal)}</strong>
          </div>
          {sales.todayPurchases > 0 && (
            <p className="hint">
              مصروفات من الكاش اليوم: {formatMoney(sales.todayPurchases)} — تُسجَّل أيضاً في صفحة
              الكاش اليومي ولا تُحتسب ضمن إجمالي المبيعات
            </p>
          )}
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
          <h3>التقرير الشهري — أغسطس {YEAR}</h3>

          <div className="summary-grid">
            <article className="summary-card">
              <h4>فرع الوسيطاء</h4>
              <dl>
                <div>
                  <dt>إجمالي المبيعات</dt>
                  <dd className="pos">{formatMoney(wasitaTotals.totalSales)}</dd>
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
                  <dt>إجمالي المبيعات</dt>
                  <dd className="pos">{formatMoney(beirutTotals.totalSales)}</dd>
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
                  <dt>إجمالي المبيعات</dt>
                  <dd className="pos">{formatMoney(grand.totalSales)}</dd>
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
                  <th>المبيعات</th>
                  <th>المصروفات</th>
                  <th>الصافي</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                  const k = dateKey(day)
                  const s = sumSalesDay(branchData.sales[k])
                  const e = sumExpenseDay(branchData.expenses[k])
                  const net = s - e
                  const wd = ARABIC_DAYS[new Date(YEAR, MONTH, day).getDay()]
                  return (
                    <tr key={day}>
                      <td>{day}</td>
                      <td>{wd}</td>
                      <td>{formatMoney(s)}</td>
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
        البيانات تُحفظ على هذا الجهاز · أغسطس {YEAR}
      </footer>
    </div>
  )
}

export default App
