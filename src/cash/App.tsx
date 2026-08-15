import { useEffect, useState } from 'react'
import {
  ARABIC_DAYS,
  BRANCHES,
  MONTH,
  YEAR,
  dateKey,
  daysInMonth,
  formatMoney,
  normalizeCashDay,
  sumField,
  type BranchId,
  type CashAppData,
  type CashDay,
  type CashMoneyField,
} from './types'
import { loadCashData, saveCashData } from './storage'

function CashApp() {
  const [data, setData] = useState<CashAppData>(() => loadCashData())
  const [selectedDay, setSelectedDay] = useState(1)
  const [savedFlash, setSavedFlash] = useState(false)

  const totalDays = daysInMonth(YEAR, MONTH)
  const key = dateKey(selectedDay)
  const weekday = ARABIC_DAYS[new Date(YEAR, MONTH, selectedDay).getDay()]

  useEffect(() => {
    saveCashData(data)
    setSavedFlash(true)
    const t = window.setTimeout(() => setSavedFlash(false), 1200)
    return () => window.clearTimeout(t)
  }, [data])

  const updateDay = (branchId: BranchId, field: CashMoneyField, value: number) => {
    setData((prev) => ({
      ...prev,
      [branchId]: {
        ...prev[branchId],
        [key]: {
          ...normalizeCashDay(prev[branchId][key]),
          [field]: value,
        },
      },
    }))
  }

  const updateExpenseNote = (branchId: BranchId, value: string) => {
    setData((prev) => ({
      ...prev,
      [branchId]: {
        ...prev[branchId],
        [key]: {
          ...normalizeCashDay(prev[branchId][key]),
          expenseNote: value,
        },
      },
    }))
  }

  const parseNum = (raw: string) => {
    const n = Number(raw.replace(/,/g, ''))
    return Number.isFinite(n) ? n : 0
  }

  const wasitaDay = normalizeCashDay(data.wasita[key])
  const beirutDay = normalizeCashDay(data.beirut[key])

  const wasitaCashTotal = sumField(data.wasita, 'cash')
  const beirutCashTotal = sumField(data.beirut, 'cash')
  const wasitaExpenseTotal = sumField(data.wasita, 'cashExpense')
  const beirutExpenseTotal = sumField(data.beirut, 'cashExpense')
  const grandCash = wasitaCashTotal + beirutCashTotal
  const grandExpense = wasitaExpenseTotal + beirutExpenseTotal
  const grandNet = grandCash - grandExpense

  const dayCash = wasitaDay.cash + beirutDay.cash
  const dayExpense = wasitaDay.cashExpense + beirutDay.cashExpense
  const dayNet = dayCash - dayExpense

  const hasDayData = (day: number) => {
    const k = dateKey(day)
    const w = normalizeCashDay(data.wasita[k])
    const b = normalizeCashDay(data.beirut[k])
    return Boolean(
      w.cash !== 0 ||
        w.cashExpense !== 0 ||
        w.expenseNote.trim() ||
        b.cash !== 0 ||
        b.cashExpense !== 0 ||
        b.expenseNote.trim(),
    )
  }

  return (
    <div className="cash-app">
      <div className="cash-bg" aria-hidden />
      <div className="cash-orb" aria-hidden />

      <header className="cash-top">
        <div className="cash-brand">
          <span className="cash-mark" aria-hidden />
          <div>
            <h1>سجل الكاش اليومي</h1>
            <p>
              من 1 إلى {totalDays} أغسطس {YEAR} · فرع الوسيطاء وفرع بيروت
            </p>
          </div>
        </div>
        <nav className="cash-links" aria-label="صفحات النظام">
          <a href="./">المحاسبة</a>
          <a className="current" href="./cash.html">
            الكاش
          </a>
          <a href="./inventory.html">المخزون</a>
        </nav>
        <div className={`cash-save ${savedFlash ? 'on' : ''}`}>
          {savedFlash ? 'تم الحفظ' : 'حفظ تلقائي'}
        </div>
      </header>

      <section className="cash-kpis" aria-label="ملخص الكاش">
        <article>
          <span>كاش الوسيطاء</span>
          <strong className="in">{formatMoney(wasitaCashTotal)}</strong>
        </article>
        <article>
          <span>كاش بيروت</span>
          <strong className="in">{formatMoney(beirutCashTotal)}</strong>
        </article>
        <article>
          <span>مصروفات الكاش</span>
          <strong className="out">{formatMoney(grandExpense)}</strong>
        </article>
        <article className="accent">
          <span>صافي الكاش</span>
          <strong className={grandNet >= 0 ? 'in' : 'out'}>{formatMoney(grandNet)}</strong>
        </article>
      </section>

      <section className="cash-day-panel">
        <div className="cash-day-head">
          <h2>
            يوم {selectedDay} أغسطس — {weekday}
          </h2>
          <p>صافي اليوم: {formatMoney(dayNet)}</p>
        </div>
        <div className="cash-day-grid" role="listbox" aria-label="أيام أغسطس">
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
            <button
              key={day}
              type="button"
              role="option"
              aria-selected={selectedDay === day}
              className={[
                'cash-day-btn',
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
      </section>

      <section className="cash-entry">
        <h3>تسجيل اليوم — الكاش ومصروفات الكاش</h3>
        <div className="cash-cards">
          {BRANCHES.map((branch) => {
            const day: CashDay = branch.id === 'wasita' ? wasitaDay : beirutDay
            const net = day.cash - day.cashExpense
            return (
              <article key={branch.id} className="cash-card">
                <h4>{branch.name}</h4>
                <label className="cash-field">
                  <span>الكاش</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={day.cash || ''}
                    placeholder="0"
                    onChange={(e) => updateDay(branch.id, 'cash', parseNum(e.target.value))}
                  />
                </label>
                <label className="cash-field expense">
                  <span>مصروفات من الكاش</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={day.cashExpense || ''}
                    placeholder="0"
                    onChange={(e) =>
                      updateDay(branch.id, 'cashExpense', parseNum(e.target.value))
                    }
                  />
                </label>
                <label className="cash-field note">
                  <span>ملاحظات المصروف — فيما صُرفت</span>
                  <textarea
                    rows={3}
                    value={day.expenseNote}
                    placeholder="مثال: شراء خضار، غاز، صيانة..."
                    onChange={(e) => updateExpenseNote(branch.id, e.target.value)}
                  />
                </label>
                <div className="cash-net">
                  <span>صافي الفرع اليوم</span>
                  <strong className={net >= 0 ? 'in' : 'out'}>{formatMoney(net)}</strong>
                </div>
              </article>
            )
          })}
        </div>

        <div className="cash-day-sum">
          <div>
            <span>كاش الفرعين</span>
            <strong className="in">{formatMoney(dayCash)}</strong>
          </div>
          <div>
            <span>مصروف الفرعين</span>
            <strong className="out">{formatMoney(dayExpense)}</strong>
          </div>
          <div>
            <span>صافي الفرعين</span>
            <strong className={dayNet >= 0 ? 'in' : 'out'}>{formatMoney(dayNet)}</strong>
          </div>
        </div>
      </section>

      <section className="cash-ledger">
        <h3>سجل الشهر — أغسطس {YEAR}</h3>
        <div className="cash-table-wrap">
          <table>
            <thead>
              <tr>
                <th>اليوم</th>
                <th>اليوم الأسبوعي</th>
                <th>كاش الوسيطاء</th>
                <th>مصروف الوسيطاء</th>
                <th>ملاحظات الوسيطاء</th>
                <th>كاش بيروت</th>
                <th>مصروف بيروت</th>
                <th>ملاحظات بيروت</th>
                <th>صافي الفرعين</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                const k = dateKey(day)
                const w = normalizeCashDay(data.wasita[k])
                const b = normalizeCashDay(data.beirut[k])
                const net = w.cash + b.cash - w.cashExpense - b.cashExpense
                const wd = ARABIC_DAYS[new Date(YEAR, MONTH, day).getDay()]
                return (
                  <tr
                    key={day}
                    className={selectedDay === day ? 'selected' : ''}
                    onClick={() => setSelectedDay(day)}
                  >
                    <td>{day}</td>
                    <td>{wd}</td>
                    <td className={w.cash > 0 ? 'in' : ''}>{formatMoney(w.cash)}</td>
                    <td className={w.cashExpense > 0 ? 'out' : ''}>
                      {formatMoney(w.cashExpense)}
                    </td>
                    <td className="note-cell">{w.expenseNote || '—'}</td>
                    <td className={b.cash > 0 ? 'in' : ''}>{formatMoney(b.cash)}</td>
                    <td className={b.cashExpense > 0 ? 'out' : ''}>
                      {formatMoney(b.cashExpense)}
                    </td>
                    <td className="note-cell">{b.expenseNote || '—'}</td>
                    <td className={net >= 0 ? 'in' : 'out'}>{formatMoney(net)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>المجموع</td>
                <td>{formatMoney(wasitaCashTotal)}</td>
                <td>{formatMoney(wasitaExpenseTotal)}</td>
                <td />
                <td>{formatMoney(beirutCashTotal)}</td>
                <td>{formatMoney(beirutExpenseTotal)}</td>
                <td />
                <td className={grandNet >= 0 ? 'in' : 'out'}>{formatMoney(grandNet)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <footer className="cash-footer">
        صفحة مستقلة لسجل الكاش · البيانات تُحفظ على هذا الجهاز فقط
      </footer>
    </div>
  )
}

export default CashApp
