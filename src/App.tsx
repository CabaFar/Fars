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
  sumExpenseDay,
  sumSalesDay,
  type AppData,
  type BranchId,
  type ExpenseKey,
  type SalesKey,
} from './types'
import { loadData, saveData } from './storage'

type Tab = 'sales' | 'expenses' | 'summary'

function App() {
  const [data, setData] = useState<AppData>(() => loadData())
  const [branch, setBranch] = useState<BranchId>('wasita')
  const [tab, setTab] = useState<Tab>('sales')
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

  const hasDayData = (day: number) => {
    const k = dateKey(day)
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
            <p>أغسطس {YEAR} · من 1 السبت حتى 31</p>
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
              يوم {selectedDay} أغسطس — {weekday}
            </h2>
            <p>
              {tab === 'sales'
                ? `إجمالي مبيعات اليوم: ${formatMoney(daySalesTotal)}`
                : `إجمالي مصروفات اليوم: ${formatMoney(dayExpenseTotal)}`}
            </p>
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
              مشتريات اليوم من الصندوق: {formatMoney(sales.todayPurchases)} — للمطابقة مع
              صفحة المشتريات (لا تُحتسب مرتين في صافي الربح)
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
        البيانات تُحفظ تلقائياً (محلي + سحابة/قرص) · أغسطس {YEAR}
      </footer>
    </div>
  )
}

export default App
