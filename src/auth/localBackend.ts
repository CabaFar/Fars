import {
  collectVaultKeys,
  applyVaultKeys,
  vaultFingerprint,
} from './vault'
import { loadSyncMeta, markLocalDirty, saveSyncMeta, saveUsername, clearUsername } from './meta'
import { DATA_CHANGED_EVENT, type SyncStatus, type VaultKeys } from './types'

declare global {
  interface Window {
    puter?: {
      auth?: { isSignedIn: () => boolean; signIn: () => Promise<void> }
      kv?: {
        set: (key: string, value: string) => Promise<void>
        get: (key: string) => Promise<string | null | undefined>
      }
    }
  }
}

type Listener = (s: SyncStatus) => void
const listeners = new Set<Listener>()

let status: SyncStatus = {
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  phase: 'idle',
  message: '',
  username: null,
  lastSavedAt: null,
}

let started = false
let syncing = false
let debounceTimer: number | null = null
let lastFingerprint = ''
let liveUser: { username: string } | null = null
let puterReady: Promise<boolean> | null = null

const ACCOUNTS_KEY = 'fars-local-accounts-v2'
const SESSION_KEY = 'fars-local-session-v2'

type AccountRec = { salt: string; hash: string }
type AccountsFile = Record<string, AccountRec>

function emit() {
  for (const l of listeners) l({ ...status })
}

function setStatus(p: Partial<SyncStatus>) {
  status = { ...status, ...p }
  emit()
}

export function subscribeSync(listener: Listener): () => void {
  listeners.add(listener)
  listener({ ...status })
  return () => listeners.delete(listener)
}

export function getSyncStatus(): SyncStatus {
  return { ...status }
}

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!)
  return btoa(s)
}

function b64ToBuf(b64: string): Uint8Array {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

async function pbkdf2(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' }, key, 256)
}

async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  return bufToB64(await pbkdf2(password, salt))
}

function loadAccounts(): AccountsFile {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}') as AccountsFile
  } catch {
    return {}
  }
}

function saveAccounts(file: AccountsFile) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(file))
}

async function ensurePuter(): Promise<boolean> {
  if (window.puter?.kv) return true
  if (!puterReady) {
    puterReady = new Promise<boolean>((resolve) => {
      const s = document.createElement('script')
      s.src = 'https://js.puter.com/v2/'
      s.async = true
      s.onload = () => resolve(Boolean(window.puter?.kv))
      s.onerror = () => resolve(false)
      document.head.appendChild(s)
    })
  }
  return puterReady
}

function vaultCloudKey(username: string) {
  return `fars-offline-vault:${username}`
}

type CloudBlob = {
  v: 1
  username: string
  keys: VaultKeys
  updatedAt: number
}

async function cloudPush(username: string, keys: VaultKeys, updatedAt: number): Promise<string> {
  const ok = await ensurePuter()
  if (!ok || !window.puter?.kv) throw new Error('تعذر الاتصال بسحابة Puter')
  if (window.puter.auth && !window.puter.auth.isSignedIn()) {
    await window.puter.auth.signIn()
  }
  const blob: CloudBlob = { v: 1, username, keys, updatedAt }
  await window.puter.kv.set(vaultCloudKey(username), JSON.stringify(blob))
  return 'تمت المزامنة السحابية (Puter)'
}

async function cloudPull(username: string): Promise<CloudBlob | null> {
  const ok = await ensurePuter()
  if (!ok || !window.puter?.kv) return null
  try {
    if (window.puter.auth && !window.puter.auth.isSignedIn()) {
      // لا نجبر تسجيل الدخول عند السحب الهادئ
      return null
    }
    const raw = await window.puter.kv.get(vaultCloudKey(username))
    if (!raw) return null
    return JSON.parse(raw) as CloudBlob
  } catch {
    return null
  }
}

export async function registerLocalUser(username: string, password: string): Promise<void> {
  const name = username.trim().toLowerCase()
  if (name.length < 3) throw new Error('اسم المستخدم يجب أن يكون 3 أحرف على الأقل')
  if (password.length < 4) throw new Error('كلمة المرور يجب أن تكون 4 أحرف على الأقل')
  const file = loadAccounts()
  if (file[name]) throw new Error('اسم المستخدم مسجّل مسبقاً على هذا الجهاز')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  file[name] = { salt: bufToB64(salt), hash: await hashPassword(password, salt) }
  saveAccounts(file)
  liveUser = { username: name }
  saveUsername(name)
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username: name }))
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username: name }))
  markLocalDirty()
  startLocalSyncEngine(name)
  await flushLocalSync(true)
}

export async function loginLocalUser(username: string, password: string): Promise<void> {
  const name = username.trim().toLowerCase()
  const rec = loadAccounts()[name]
  if (rec) {
    const hash = await hashPassword(password, b64ToBuf(rec.salt))
    if (hash !== rec.hash) throw new Error('كلمة المرور غير صحيحة')
  } else {
    // جهاز جديد: أنشئ الحساب محلياً إن لم يوجد، بعد محاولة السحب
    const remote = await cloudPull(name)
    if (remote) {
      applyVaultKeys(remote.keys, 'cloud')
      const salt = crypto.getRandomValues(new Uint8Array(16))
      const file = loadAccounts()
      file[name] = { salt: bufToB64(salt), hash: await hashPassword(password, salt) }
      saveAccounts(file)
    } else if (!rec) {
      // أول استخدام: سجّل تلقائياً
      await registerLocalUser(name, password)
      return
    }
  }
  liveUser = { username: name }
  saveUsername(name)
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username: name }))
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username: name }))
  // اسحب الأحدث إن أمكن
  if (navigator.onLine) {
    try {
      const ready = await ensurePuter()
      if (ready && window.puter?.auth && !window.puter.auth.isSignedIn()) {
        await window.puter.auth.signIn()
      }
      const remote = await cloudPull(name)
      if (remote) {
        const meta = loadSyncMeta()
        if (remote.updatedAt >= meta.localUpdatedAt) {
          applyVaultKeys(remote.keys, 'cloud')
          const next = loadSyncMeta()
          next.localUpdatedAt = remote.updatedAt
          next.remoteUpdatedAt = remote.updatedAt
          next.pendingPush = false
          saveSyncMeta(next)
        }
      }
    } catch {
      // نكمل محلياً
    }
  }
  startLocalSyncEngine(name)
  await flushLocalSync(false)
}

export function restoreLocalSession(): { username: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { username: string }
    if (!parsed.username) return null
    liveUser = { username: parsed.username }
    saveUsername(parsed.username)
    startLocalSyncEngine(parsed.username)
    if (navigator.onLine) void flushLocalSync(false)
    return { username: parsed.username }
  } catch {
    return null
  }
}

export function logoutLocalUser(): void {
  liveUser = null
  clearUsername()
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
  stopLocalSyncEngine()
  window.location.reload()
}

export async function flushLocalSync(force = false): Promise<void> {
  if (!liveUser || syncing) return
  const keys = collectVaultKeys()
  const fp = vaultFingerprint(keys)
  const meta = loadSyncMeta()
  if (!force && !meta.pendingPush && fp === lastFingerprint) return

  // دائماً محلي أولاً
  setStatus({
    online: navigator.onLine,
    phase: navigator.onLine ? 'syncing' : 'offline',
    message: navigator.onLine ? 'حفظ محلي… جاري الرفع' : 'حفظ محلي (بدون إنترنت)',
    lastSavedAt: Date.now(),
    username: liveUser.username,
  })

  if (!navigator.onLine) {
    markLocalDirty()
    setStatus({ phase: 'offline', message: 'بدون إنترنت — البيانات محفوظة على الجهاز', online: false })
    return
  }

  syncing = true
  try {
    const updatedAt = Math.max(meta.localUpdatedAt, Date.now())
    const msg = await cloudPush(liveUser.username, keys, updatedAt)
    const next = loadSyncMeta()
    next.pendingPush = false
    next.lastPushAt = Date.now()
    next.localUpdatedAt = updatedAt
    next.remoteUpdatedAt = updatedAt
    next.lastError = null
    saveSyncMeta(next)
    lastFingerprint = fp
    setStatus({ phase: 'ok', message: msg, lastSavedAt: next.lastPushAt, online: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'فشل الرفع السحابي'
    const next = loadSyncMeta()
    next.pendingPush = true
    next.lastError = message
    saveSyncMeta(next)
    setStatus({
      phase: 'error',
      message: `${message} · البيانات محفوظة محلياً`,
      online: navigator.onLine,
    })
  } finally {
    syncing = false
  }
}

function schedule() {
  markLocalDirty()
  setStatus({
    online: navigator.onLine,
    phase: navigator.onLine ? 'syncing' : 'offline',
    message: navigator.onLine ? 'حفظ محلي…' : 'حفظ محلي (بدون نت)',
    lastSavedAt: Date.now(),
  })
  if (debounceTimer) window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => void flushLocalSync(false), 800)
}

function onChange(ev: Event) {
  const detail = (ev as CustomEvent<{ source?: string }>).detail
  if (detail?.source === 'cloud') {
    lastFingerprint = vaultFingerprint(collectVaultKeys())
    return
  }
  schedule()
}

export function startLocalSyncEngine(username: string): void {
  if (started) {
    setStatus({ username })
    return
  }
  started = true
  setStatus({ username, online: navigator.onLine })
  lastFingerprint = vaultFingerprint(collectVaultKeys())
  window.addEventListener(DATA_CHANGED_EVENT, onChange)
  window.addEventListener('online', () => {
    setStatus({ online: true, phase: 'syncing', message: 'عاد الاتصال — جاري المزامنة' })
    void flushLocalSync(true)
  })
  window.addEventListener('offline', () => {
    setStatus({ online: false, phase: 'offline', message: 'بدون إنترنت — العمل مستمر محلياً' })
  })
  window.setInterval(() => {
    if (navigator.onLine) void flushLocalSync(false)
  }, 25_000)
  // polling soft sync for other devices when Puter available
  window.setInterval(() => {
    if (!liveUser || !navigator.onLine || syncing) return
    void (async () => {
      const remote = await cloudPull(liveUser!.username)
      if (!remote) return
      const meta = loadSyncMeta()
      if (remote.updatedAt > meta.localUpdatedAt && !meta.pendingPush) {
        applyVaultKeys(remote.keys, 'cloud')
        const next = loadSyncMeta()
        next.localUpdatedAt = remote.updatedAt
        next.remoteUpdatedAt = remote.updatedAt
        saveSyncMeta(next)
        setStatus({ phase: 'ok', message: 'تحديث من جهاز آخر', lastSavedAt: Date.now() })
      }
    })()
  }, 12_000)
}

export function stopLocalSyncEngine(): void {
  started = false
  window.removeEventListener(DATA_CHANGED_EVENT, onChange)
  if (debounceTimer) window.clearTimeout(debounceTimer)
}
