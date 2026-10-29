import { useRef, useState } from 'react'
import { downloadBackup, inspectBackup, readBackupFile, restoreBackup } from './backup'

const CONFIRM_FULL =
  'سيتم استبدال جميع بيانات المحاسبة والكاش والمخزون والموارد البشرية بالنسخة المختارة. هل تريد المتابعة؟'
const CONFIRM_INVENTORY =
  'هذا ملف مخزون فقط. سيتم استبدال بيانات المخزون الحالية دون الصفحات الأخرى. هل تريد المتابعة؟'

export function BackupBar() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const onPick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const parsed = await readBackupFile(file)
      const kind = inspectBackup(parsed)
      const ok = window.confirm(kind === 'full' ? CONFIRM_FULL : CONFIRM_INVENTORY)
      if (!ok) return
      restoreBackup(parsed)
      window.location.reload()
    } catch {
      window.alert('تعذر قراءة الملف. تأكد أنه نسخة احتياطية صحيحة.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="sys-backup no-print" aria-label="نسخة احتياطية كاملة">
      <div>
        <h2>نسخة احتياطية كاملة</h2>
        <p>احفظ كل الصفحات في ملف واحد على جهازك. الاستعادة تستبدل البيانات الحالية.</p>
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
    </section>
  )
}
