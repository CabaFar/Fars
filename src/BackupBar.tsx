import { useEffect, useRef, useState } from 'react'
import { downloadBackup, inspectBackup, readBackupFile, restoreBackup } from './backup'
import { getBrandId } from './brand'
import {
  FARS_DASHBOARD_SQL,
  flushCloudPush,
  getCloudStatus,
  prepareCloud,
  readSavedCloudConfig,
  saveCloudConfig,
  subscribeCloudStatus,
} from './cloudSync'
import { notifyLocalChange } from './notifyChange'

const CONFIRM_FULL =
  'سيتم استبدال جميع بيانات المحاسبة والكاش والمخزون والموارد البشرية بالنسخة المختارة. هل تريد المتابعة؟'
const CONFIRM_INVENTORY =
  'هذا ملف مخزون فقط. سيتم استبدال بيانات المخزون الحالية دون الصفحات الأخرى. هل تريد المتابعة؟'

function formatSyncTime(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('ar-SA', {
    timeZone: 'Asia/Riyadh',
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  })
}

export function BackupBar() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(getCloudStatus)
  const saved = readSavedCloudConfig()
  const [url, setUrl] = useState(saved.url)
  const [anonKey, setAnonKey] = useState(saved.anonKey)
  const [copied, setCopied] = useState(false)
  const [editConfig, setEditConfig] = useState(false)
  const isFars = getBrandId() === 'fars'

  useEffect(() => subscribeCloudStatus(() => setStatus(getCloudStatus())), [])

  const onPick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const parsed = await readBackupFile(file)
      const kind = inspectBackup(parsed)
      const ok = window.confirm(kind === 'full' ? CONFIRM_FULL : CONFIRM_INVENTORY)
      if (!ok) return
      restoreBackup(parsed)
      notifyLocalChange()
      if (isFars) {
        try {
          await flushCloudPush()
        } catch {
          /* local restore still applied */
        }
      }
      window.location.reload()
    } catch {
      window.alert('تعذر قراءة الملف. تأكد أنه نسخة احتياطية صحيحة.')
    } finally {
      setBusy(false)
    }
  }

  const onConnect = async () => {
    if (!url.trim() || !anonKey.trim()) {
      window.alert('أدخل رابط مشروع Supabase ومفتاح anon.')
      return
    }
    setBusy(true)
    try {
      saveCloudConfig(url, anonKey)
      notifyLocalChange()
      await prepareCloud()
      const next = getCloudStatus()
      if (next.lastError) {
        window.alert(next.lastError)
        return
      }
      window.location.reload()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'تعذر الربط بـ Supabase.')
    } finally {
      setBusy(false)
    }
  }

  const onCopySql = async () => {
    try {
      await navigator.clipboard.writeText(FARS_DASHBOARD_SQL)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.alert('انسخ أمر SQL يدوياً من المربع.')
    }
  }

  return (
    <section className="sys-backup no-print" aria-label="نسخة احتياطية كاملة">
      <div>
        <h2>{isFars ? 'نسخة احتياطية على الرابط' : 'نسخة احتياطية كاملة'}</h2>
        <p>
          {isFars
            ? 'أي تعديل في المحاسبة أو الكاش أو المخزون أو الموارد البشرية يُحفظ تلقائياً ويظهر على كامل الرابط وعلى أي جهاز.'
            : 'احفظ كل الصفحات في ملف واحد على جهازك. الاستعادة تستبدل البيانات الحالية.'}
        </p>
        {isFars && status.configured && (
          <p className={`sys-backup-status${status.lastError ? ' is-error' : ''}`}>
            {status.syncing
              ? 'جاري حفظ التعديل على الرابط…'
              : status.lastError
                ? status.lastError
                : status.lastSyncedAt
                  ? `محفوظ على الرابط — آخر مزامنة ${formatSyncTime(status.lastSyncedAt)}`
                  : 'الرابط مربوط. التعديلات تُحفظ تلقائياً.'}
          </p>
        )}
      </div>
      <div className="sys-backup-actions">
        <button type="button" onClick={downloadBackup} disabled={busy}>
          تنزيل كل البيانات
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          استعادة من ملف
        </button>
        {isFars && status.configured && !editConfig && (
          <button type="button" className="ghost" onClick={() => setEditConfig(true)} disabled={busy}>
            تغيير الربط
          </button>
        )}
        {isFars && status.lastError?.includes('الجدول') && (
          <button type="button" className="ghost" onClick={() => void onCopySql()} disabled={busy}>
            {copied ? 'تم نسخ أمر الجدول' : 'نسخ أمر الجدول'}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            void onPick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>
      {isFars && (!status.configured || editConfig) && (
        <form
          className="sys-backup-cloud"
          onSubmit={(e) => {
            e.preventDefault()
            void onConnect()
          }}
        >
          <div className="sys-backup-guide" aria-label="خطوات الربط بالصور">
            <figure>
              <img src={`${import.meta.env.BASE_URL}guide/step1.png`} alt="الخطوة 1: SQL Editor ثم Run" />
              <figcaption>١ — SQL Editor ثم Run</figcaption>
            </figure>
            <figure>
              <img src={`${import.meta.env.BASE_URL}guide/step2.png`} alt="الخطوة 2: نسخ Project URL ومفتاح anon" />
              <figcaption>٢ — Settings ثم API Keys</figcaption>
            </figure>
            <figure>
              <img src={`${import.meta.env.BASE_URL}guide/step3.png`} alt="الخطوة 3: الربط في صفحة شاورما" />
              <figcaption>٣ — الصق هنا ثم ربط النسخ</figcaption>
            </figure>
          </div>
          <p>
            مرة واحدة: في SQL Editor شغّل أمر الجدول، ثم من Settings → API Keys انسخ Project URL ومفتاح anon
            public أو publishable فقط.
          </p>
          <label>
            رابط المشروع
            <input
              type="url"
              dir="ltr"
              placeholder="https://xxxx.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label>
            مفتاح anon / publishable
            <input
              type="text"
              dir="ltr"
              placeholder="eyJ... أو sb_publishable_..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              autoComplete="off"
            />
          </label>
          <div className="sys-backup-actions">
            <button type="submit" disabled={busy}>
              ربط النسخ على الرابط
            </button>
            <button type="button" className="ghost" onClick={() => void onCopySql()} disabled={busy}>
              {copied ? 'تم نسخ أمر الجدول' : 'نسخ أمر الجدول'}
            </button>
          </div>
          <details className="sys-backup-sql">
            <summary>أمر إنشاء الجدول في SQL Editor</summary>
            <pre dir="ltr">{FARS_DASHBOARD_SQL}</pre>
          </details>
        </form>
      )}
    </section>
  )
}
