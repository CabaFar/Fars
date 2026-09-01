import { useEffect, useMemo, useState } from 'react'
import {
  employeesForMonth,
  ensureMonth,
  loadStore,
  saveStore,
  setMonthEmployees,
  type HrStore,
} from './storage'
import {
  DOC_FIELDS,
  PAYMENT_METHODS,
  advancesTotal,
  deductionsTotal,
  emptyEmployee,
  expiryInfo,
  formatDateAr,
  formatMoney,
  grossSalaryTotal,
  monthKey,
  monthLabel,
  netSalary,
  netSalaryTotal,
  parseNum,
  paymentMethodLabel,
  shiftMonth,
  type DocKey,
  type Employee,
  type ExpiryTone,
  type SalaryPaymentMethod,
} from './types'

type FormState = Omit<Employee, 'id'> & { id?: string }

function todayParts() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() }
}

function HrApp() {
  const now = todayParts()
  const [store, setStore] = useState<HrStore>(() => {
    const t = todayParts()
    return ensureMonth(loadStore(), monthKey(t.year, t.month))
  })
  const [year, setYear] = useState(now.year)
  const [month, setMonth] = useState(now.month)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<FormState | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  const key = monthKey(year, month)
  const viewStore = store.months[key] ? store : ensureMonth(store, key)
  const employees = employeesForMonth(viewStore, key)

  useEffect(() => {
    saveStore(store)
    setSavedFlash(true)
    const t = window.setTimeout(() => setSavedFlash(false), 1200)
    return () => window.clearTimeout(t)
  }, [store])

  useEffect(() => {
    setStore((prev) => ensureMonth(prev, key))
  }, [key])

  const setEmployees = (updater: Employee[] | ((prev: Employee[]) => Employee[])) => {
    setStore((prev) => {
      const current = employeesForMonth(ensureMonth(prev, key), key)
      const next = typeof updater === 'function' ? updater(current) : updater
      return setMonthEmployees(prev, key, next)
    })
  }

  const visible = useMemo(() => {
    const q = query.trim()
    if (!q) return employees
    return employees.filter((emp) => emp.name.includes(q) || emp.jobTitle.includes(q))
  }, [employees, query])

  const alertCounts = useMemo(() => {
    const counts = { expired: 0, urgent: 0, warn: 0, ok: 0 }
    for (const emp of employees) {
      for (const field of DOC_FIELDS) {
        const tone = expiryInfo(emp[field.key]).tone
        if (tone === 'expired') counts.expired += 1
        else if (tone === 'urgent') counts.urgent += 1
        else if (tone === 'warn') counts.warn += 1
        else if (tone === 'ok') counts.ok += 1
      }
    }
    return counts
  }, [employees])

  const grossTotal = useMemo(() => grossSalaryTotal(employees), [employees])
  const deductTotal = useMemo(() => deductionsTotal(employees), [employees])
  const advanceTotal = useMemo(() => advancesTotal(employees), [employees])
  const payrollNet = useMemo(() => netSalaryTotal(employees), [employees])

  const goMonth = (delta: number) => {
    const next = shiftMonth(year, month, delta)
    setYear(next.year)
    setMonth(next.month)
  }

  const goToday = () => {
    const t = todayParts()
    setYear(t.year)
    setMonth(t.month)
  }

  const openAdd = () => setEditing(emptyEmployee())

  const openEdit = (emp: Employee) => {
    setEditing({
      id: emp.id,
      name: emp.name,
      jobTitle: emp.jobTitle,
      salary: emp.salary,
      paymentMethod: emp.paymentMethod ?? 'cash',
      deductions: emp.deductions,
      deductionNote: emp.deductionNote ?? '',
      advances: emp.advances,
      iqamaExpiry: emp.iqamaExpiry,
      healthCertExpiry: emp.healthCertExpiry,
      medicalInsuranceExpiry: emp.medicalInsuranceExpiry,
    })
  }

  const removeEmployee = (emp: Employee) => {
    const ok = window.confirm(`حذف الموظف «${emp.name || 'بدون اسم'}»؟`)
    if (!ok) return
    setEmployees((prev) => prev.filter((row) => row.id !== emp.id))
  }

  const saveEmployee = (form: FormState) => {
    const name = form.name.trim()
    if (!name) {
      window.alert('أدخل اسم الموظف')
      return
    }
    const payload: Employee = {
      id: form.id || `emp-${Date.now()}`,
      name,
      jobTitle: form.jobTitle.trim(),
      salary: form.salary || 0,
      paymentMethod: form.paymentMethod === 'transfer' ? 'transfer' : 'cash',
      deductions: form.deductions || 0,
      deductionNote: form.deductionNote.trim(),
      advances: form.advances || 0,
      iqamaExpiry: form.iqamaExpiry,
      healthCertExpiry: form.healthCertExpiry,
      medicalInsuranceExpiry: form.medicalInsuranceExpiry,
    }
    setEmployees((prev) => {
      const exists = prev.some((row) => row.id === payload.id)
      if (exists) return prev.map((row) => (row.id === payload.id ? payload : row))
      return [...prev, payload]
    })
    setEditing(null)
  }

  return (
    <div className="hr-app">
      <header className="hr-top">
        <div className="hr-brand">
          <span className="hr-mark" aria-hidden />
          <div>
            <h1>الموارد البشرية</h1>
            <p>إجمالي الرواتب بدون الخصومات والسلف · سجل شهري محفوظ</p>
          </div>
        </div>
        <nav className="hr-links" aria-label="صفحات النظام">
          <a href="./">المحاسبة</a>
          <a href="./cash.html">الكاش</a>
          <a href="./inventory.html">المخزون</a>
          <a className="current" href="./hr.html">
            الموارد البشرية
          </a>
        </nav>
        <div className={`hr-save ${savedFlash ? 'on' : ''}`}>
          {savedFlash ? 'تم الحفظ' : 'حفظ تلقائي'}
        </div>
      </header>

      <section className="hr-month" aria-label="الشهر">
        <button type="button" onClick={() => goMonth(-1)} aria-label="الشهر السابق">
          ›
        </button>
        <div>
          <h2>{monthLabel(year, month)}</h2>
          <p>كل شهر له سجل رواتب وخصومات وسلف مستقل، والموظفون يُنقلون تلقائياً للشهر الجديد</p>
        </div>
        <button type="button" onClick={() => goMonth(1)} aria-label="الشهر التالي">
          ‹
        </button>
        <button type="button" className="ghost" onClick={goToday}>
          هذا الشهر
        </button>
      </section>

      <section className="hr-legend" aria-label="مفتاح ألوان التنبيه">
        <span className="tone ok">أخضر: أكثر من 60 يوم</span>
        <span className="tone warn">أصفر: أقل من 60 يوم</span>
        <span className="tone urgent">برتقالي: أقل من 30 يوم</span>
        <span className="tone expired">أحمر: منتهي</span>
      </section>

      <section className="hr-kpis" aria-label="ملخص الموارد البشرية">
        <article>
          <span>عدد الموظفين</span>
          <strong>{employees.length}</strong>
        </article>
        <article className="accent">
          <span>إجمالي الرواتب</span>
          <strong>{formatMoney(grossTotal)} ر.س</strong>
          <small>بدون الخصومات والسلف</small>
        </article>
        <article>
          <span>إجمالي الخصومات</span>
          <strong>{formatMoney(deductTotal)} ر.س</strong>
        </article>
        <article>
          <span>إجمالي السلف</span>
          <strong>{formatMoney(advanceTotal)} ر.س</strong>
        </article>
        <article>
          <span>صافي الرواتب</span>
          <strong>{formatMoney(payrollNet)} ر.س</strong>
        </article>
        <article className={alertCounts.warn ? 'warn' : ''}>
          <span>تنبيه أقل من 60 يوم</span>
          <strong>{alertCounts.warn}</strong>
        </article>
        <article className={alertCounts.urgent ? 'urgent' : ''}>
          <span>تنبيه أقل من 30 يوم</span>
          <strong>{alertCounts.urgent}</strong>
        </article>
        <article className={alertCounts.expired ? 'expired' : ''}>
          <span>وثائق منتهية</span>
          <strong>{alertCounts.expired}</strong>
        </article>
      </section>

      <section className="hr-toolbar">
        <input
          className="hr-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="بحث بالاسم أو المسمى الوظيفي..."
          aria-label="بحث عن موظف"
        />
        <button type="button" className="hr-add" onClick={openAdd}>
          إضافة موظف
        </button>
      </section>

      <section className="hr-sheet">
        <div className="hr-sheet-head">
          <h2>سجل الموظفين — {monthLabel(year, month)}</h2>
          <p>
            إجمالي الرواتب = مجموع الراتب الأساسي بدون خصم ولا سلف · صافي الراتب = الراتب − الخصومات −
            السلف
          </p>
        </div>
        <div className="hr-table-wrap">
          <table className="hr-table">
            <thead>
              <tr>
                <th>اسم الموظف</th>
                <th>المسمى الوظيفي</th>
                <th>الراتب</th>
                <th>طريقة الصرف</th>
                <th>الخصومات</th>
                <th>سبب الخصم</th>
                <th>السلف</th>
                <th>صافي الراتب</th>
                <th>انتهاء الإقامة</th>
                <th>انتهاء الشهادة الصحية</th>
                <th>انتهاء التأمين الطبي</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <strong>{emp.name}</strong>
                  </td>
                  <td>{emp.jobTitle || '—'}</td>
                  <td>{formatMoney(emp.salary)}</td>
                  <td>
                    <span className={`pay-badge pay-${emp.paymentMethod ?? 'cash'}`}>
                      {paymentMethodLabel(emp.paymentMethod)}
                    </span>
                  </td>
                  <td>{formatMoney(emp.deductions)}</td>
                  <td className="note-cell">{emp.deductionNote || '—'}</td>
                  <td>{formatMoney(emp.advances)}</td>
                  <td>
                    <strong>{formatMoney(netSalary(emp))}</strong>
                  </td>
                  {DOC_FIELDS.map((field) => (
                    <td key={field.key}>
                      <ExpiryBadge dateValue={emp[field.key]} />
                    </td>
                  ))}
                  <td>
                    <div className="hr-actions">
                      <button type="button" className="tiny" onClick={() => openEdit(emp)}>
                        تعديل
                      </button>
                      <button
                        type="button"
                        className="tiny danger"
                        onClick={() => removeEmployee(emp)}
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {visible.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}>المجموع</td>
                  <td>{formatMoney(grossSalaryTotal(visible))} ر.س</td>
                  <td />
                  <td>{formatMoney(deductionsTotal(visible))} ر.س</td>
                  <td />
                  <td>{formatMoney(advancesTotal(visible))} ر.س</td>
                  <td>{formatMoney(netSalaryTotal(visible))} ر.س</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {visible.length === 0 && (
          <p className="hr-empty">
            {employees.length === 0
              ? 'لا يوجد موظفون بعد — اضغط «إضافة موظف» للبدء.'
              : 'لا توجد نتائج مطابقة للبحث.'}
          </p>
        )}
      </section>

      {editing && (
        <EmployeeDialog
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={saveEmployee}
        />
      )}
    </div>
  )
}

function ExpiryBadge({ dateValue }: { dateValue: string }) {
  const info = expiryInfo(dateValue)
  return (
    <div className={`expiry-badge tone-${info.tone}`}>
      <strong>{formatDateAr(dateValue)}</strong>
      <span>{info.label}</span>
    </div>
  )
}

function EmployeeDialog({
  initial,
  onCancel,
  onSave,
}: {
  initial: FormState
  onCancel: () => void
  onSave: (form: FormState) => void
}) {
  const [form, setForm] = useState<FormState>(initial)
  const net = netSalary(form)
  const isEdit = Boolean(initial.id)

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="hr-modal-backdrop" role="presentation" onClick={onCancel}>
      <form
        className="hr-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hr-emp-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          onSave(form)
        }}
      >
        <h3 id="hr-emp-title">{isEdit ? 'تعديل موظف' : 'إضافة موظف'}</h3>

        <div className="hr-form-grid">
          <label>
            <span>اسم الموظف</span>
            <input
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              required
              autoFocus
            />
          </label>
          <label>
            <span>المسمى الوظيفي</span>
            <input
              value={form.jobTitle}
              onChange={(e) => setField('jobTitle', e.target.value)}
              placeholder="مثال: شيف شاورما"
            />
          </label>
          <label>
            <span>الراتب</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={form.salary || ''}
              onChange={(e) => setField('salary', parseNum(e.target.value))}
            />
          </label>
          <label>
            <span>طريقة صرف الراتب</span>
            <select
              value={form.paymentMethod}
              onChange={(e) => setField('paymentMethod', e.target.value as SalaryPaymentMethod)}
              aria-label="طريقة صرف الراتب"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>الخصومات</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={form.deductions || ''}
              onChange={(e) => setField('deductions', parseNum(e.target.value))}
            />
          </label>
          <label className="span-2">
            <span>ملاحظة سبب الخصم</span>
            <textarea
              rows={2}
              value={form.deductionNote}
              placeholder="مثال: غياب يومين، تأخير، خصم عهدة..."
              onChange={(e) => setField('deductionNote', e.target.value)}
            />
          </label>
          <label>
            <span>السلف</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={form.advances || ''}
              onChange={(e) => setField('advances', parseNum(e.target.value))}
            />
          </label>
          <div className="hr-net-box">
            <span>صافي الراتب</span>
            <strong>{formatMoney(net)} ر.س</strong>
          </div>
          {(
            [
              ['iqamaExpiry', 'تاريخ انتهاء الإقامة'],
              ['healthCertExpiry', 'تاريخ انتهاء الشهادة الصحية'],
              ['medicalInsuranceExpiry', 'تاريخ انتهاء التأمين الطبي'],
            ] as [DocKey, string][]
          ).map(([key, label]) => (
            <label key={key}>
              <span>{label}</span>
              <input
                type="date"
                value={form[key]}
                onChange={(e) => setField(key, e.target.value)}
              />
              <ExpiryPreview dateValue={form[key]} />
            </label>
          ))}
        </div>

        <div className="hr-modal-actions">
          <button type="button" className="ghost" onClick={onCancel}>
            إلغاء
          </button>
          <button type="submit">{isEdit ? 'حفظ التعديل' : 'إضافة الموظف'}</button>
        </div>
      </form>
    </div>
  )
}

function ExpiryPreview({ dateValue }: { dateValue: string }) {
  const info = expiryInfo(dateValue)
  if (info.tone === 'empty') return null
  return <small className={`tone-${info.tone as ExpiryTone}`}>{info.label}</small>
}

export default HrApp
