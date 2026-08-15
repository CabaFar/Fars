import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { loginUser, logoutUser, registerUser, restoreAuthSession, getCachedUsername } from './authService'
import { flushSync, getSyncStatus, subscribeSync } from './syncEngine'
import { isSupabaseConfigured } from './supabaseClient'
import type { SyncStatus } from './types'
import './auth.css'

type Mode = 'login' | 'register'

function formatTime(ts: number | null): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function SyncBar() {
  const [status, setStatus] = useState<SyncStatus>(() => getSyncStatus())
  const username = status.username || getCachedUsername()

  useEffect(() => subscribeSync(setStatus), [])

  if (!username) return null

  const phaseLabel =
    status.phase === 'syncing'
      ? 'جاري المزامنة…'
      : status.phase === 'offline'
        ? 'بدون نت · حفظ محلي'
        : status.phase === 'error'
          ? status.message || 'خطأ مزامنة'
          : status.phase === 'ok'
            ? `متزامن · ${formatTime(status.lastSavedAt)}`
            : status.message || 'جاهز'

  return (
    <div className="fars-syncbar" role="status">
      <div className="fars-syncbar-user">
        <strong>{username}</strong>
        <span className={status.online ? 'fars-dot-on' : 'fars-dot-off'}>
          {status.online ? 'متصل' : 'غير متصل'}
        </span>
        <span>{phaseLabel}</span>
      </div>
      <div className="fars-syncbar-actions">
        <button type="button" onClick={() => void flushSync()} disabled={!status.online}>
          مزامنة الآن
        </button>
        <button type="button" className="danger" onClick={() => void logoutUser()}>
          خروج
        </button>
      </div>
    </div>
  )
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [mode, setMode] = useState<Mode>('register')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const configured = isSupabaseConfigured()

  useEffect(() => {
    void (async () => {
      try {
        const session = await restoreAuthSession()
        if (session) setAuthed(true)
      } catch {
        // لا جلسة
      }
      setReady(true)
    })()
  }, [])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'register') await registerUser(username, password)
      else await loginUser(username, password)
      setAuthed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الدخول')
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
            قاعدة PostgreSQL (Supabase) · مزامنة فورية بين الأجهزة · يعمل بدون إنترنت بعد أول دخول
          </p>
          {!configured ? (
            <p className="fars-auth-error">
              لم تُربط قاعدة البيانات بعد. أنشئ مشروع Supabase مجاني وأضف المفاتيح، أو نفّذ SQL من مجلد
              supabase/schema.sql
            </p>
          ) : null}
          <form onSubmit={onSubmit} className="fars-auth-form">
            <label>
              اسم المستخدم
              <input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                disabled={!configured}
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
                disabled={!configured}
              />
            </label>
            {error ? <p className="fars-auth-error">{error}</p> : null}
            <button type="submit" disabled={busy || !configured}>
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
            <p>
              بعد أول دخول يبقى العمل شغّال بدون نت (حفظ محلي). عند عودة الاتصال تُزامَن كل الأجهزة
              تلقائياً.
            </p>
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
