import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  loginFromDiskBlob,
  loginOrRegister,
  logoutUser,
  registerUser,
  subscribeSync,
  exportBackupDownload,
  flushSync,
  getSyncStatus,
  startAutoSync,
} from './sync'
import {
  openEncryptedBlobWithKey,
  pickDiskFileForOpen,
  pickDiskFileForSave,
  pullCloud,
  readDiskBackupFile,
} from './cloud'
import { hasAnyLocalAccount } from './accounts'
import { getLiveSession, restoreSession } from './session'
import { applyVaultPayload } from './vault'
import type { SyncStatus } from './types'
import './auth.css'

type Mode = 'login' | 'register'

function formatTime(ts: number | null): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function SyncBar() {
  const [status, setStatus] = useState<SyncStatus>(() => getSyncStatus())
  const session = getLiveSession()

  useEffect(() => subscribeSync(setStatus), [])

  if (!session) return null

  return (
    <div className="fars-syncbar" role="status">
      <div className="fars-syncbar-user">
        <strong>{session.username}</strong>
        <span>
          {status.cloud === 'saving'
            ? 'جاري الحفظ…'
            : status.cloud === 'ok'
              ? `محفوظ · ${formatTime(status.lastSavedAt)}`
              : status.cloudMessage || 'بانتظار الحفظ'}
        </span>
      </div>
      <div className="fars-syncbar-actions">
        <button type="button" onClick={() => void flushSync(true)}>
          مزامنة الآن
        </button>
        <button type="button" onClick={() => void pickDiskFileForSave()}>
          ربط ملف على القرص
        </button>
        <button type="button" onClick={exportBackupDownload}>
          تنزيل نسخة
        </button>
        <button type="button" className="danger" onClick={logoutUser}>
          خروج
        </button>
      </div>
    </div>
  )
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [mode, setMode] = useState<Mode>(() => (hasAnyLocalAccount() ? 'login' : 'register'))
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void (async () => {
      const session = await restoreSession()
      if (session) {
        try {
          const remote = await pullCloud(session.username)
          if (remote) {
            const payload = await openEncryptedBlobWithKey(remote, session.key)
            applyVaultPayload(payload)
          }
        } catch {
          // استخدم النسخة المحلية إن فشلت السحابة
        }
        setAuthed(true)
        startAutoSync()
      }
      setReady(true)
    })()
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      setAuthed(Boolean(getLiveSession()))
    }, 800)
    return () => window.clearInterval(id)
  }, [])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'register') {
        await registerUser(username, password, remember)
      } else {
        // إن لم يوجد حساب محلي/سحابي يُنشأ تلقائياً عند أول دخول
        await loginOrRegister(username, password, remember, true)
      }
      setAuthed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الدخول')
    } finally {
      setBusy(false)
    }
  }

  const importFile = async (file: File) => {
    setError('')
    setBusy(true)
    try {
      if (!password) throw new Error('أدخل كلمة المرور لفتح النسخة المشفّرة')
      const blob = await readDiskBackupFile(file)
      await loginFromDiskBlob(blob, password, remember)
      setAuthed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل استيراد الملف')
    } finally {
      setBusy(false)
    }
  }

  const importViaPicker = async () => {
    setError('')
    setBusy(true)
    try {
      if (!password) throw new Error('أدخل كلمة المرور أولاً')
      const blob = await pickDiskFileForOpen()
      if (!blob) return
      await loginFromDiskBlob(blob, password, remember)
      setAuthed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل فتح الملف')
    } finally {
      setBusy(false)
    }
  }

  if (!ready) {
    return (
      <div className="fars-auth-screen">
        <p className="fars-auth-loading">جاري التحميل…</p>
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="fars-auth-screen">
        <div className="fars-auth-card">
          <p className="fars-brand">فارس</p>
          <h1>{mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}</h1>
          <p className="fars-auth-lead">
            {mode === 'register'
              ? 'أول مرة؟ أنشئ اسم مستخدم وكلمة مرور — البيانات تُحفظ تلقائياً على هذا الجهاز.'
              : 'أدخل نفس اسم المستخدم وكلمة المرور. إن لم يكن الحساب موجوداً سيُنشأ تلقائياً.'}
          </p>
          <form onSubmit={onSubmit} className="fars-auth-form">
            <label>
              اسم المستخدم
              <input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
              />
            </label>
            <label>
              كلمة المرور
              <input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={4}
              />
            </label>
            <label className="fars-check">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              تذكرني على هذا الجهاز
            </label>
            {error ? <p className="fars-auth-error">{error}</p> : null}
            <button type="submit" disabled={busy}>
              {busy ? '...' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}
            </button>
          </form>
          <div className="fars-auth-switch">
            {mode === 'login' ? (
              <button type="button" onClick={() => setMode('register')}>
                حساب جديد
              </button>
            ) : (
              <button type="button" onClick={() => setMode('login')}>
                لدي حساب
              </button>
            )}
          </div>
          <div className="fars-auth-disk">
            <p>جهاز آخر بدون سحابة؟ استورد نسخة القرص المشفّرة بعد إدخال كلمة المرور:</p>
            <div className="fars-auth-disk-actions">
              <button type="button" onClick={() => void importViaPicker()} disabled={busy}>
                اختيار ملف
              </button>
              <label className="fars-file-btn">
                رفع ملف
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void importFile(file)
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <SyncBar />
      {children}
    </>
  )
}
