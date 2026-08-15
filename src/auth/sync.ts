import {
  buildEncryptedBlob,
  encryptCurrentVault,
  pullCloud,
  pushCloud,
  restoreFromBlob,
  writeDiskHandle,
  downloadDiskBackup,
} from './cloud'
import { registerLocalAccount, verifyLocalAccount, normalizeUsername, getLocalAccount } from './accounts'
import { b64ToBuf, deriveAesKey } from './crypto'
import { clearSession, getLiveSession, setLiveSession } from './session'
import { DATA_CHANGED_EVENT, type SyncStatus } from './types'
import { collectVaultPayload, vaultFingerprint } from './vault'

type Listener = (status: SyncStatus) => void

let status: SyncStatus = {
  local: true,
  cloud: 'idle',
  cloudMessage: '',
  disk: 'none',
  lastSavedAt: null,
}

const listeners = new Set<Listener>()
let debounceTimer: number | null = null
let lastFingerprint = ''
let started = false
let syncing = false

function emit(): void {
  for (const listener of listeners) listener({ ...status })
}

export function subscribeSync(listener: Listener): () => void {
  listeners.add(listener)
  listener({ ...status })
  return () => listeners.delete(listener)
}

export function getSyncStatus(): SyncStatus {
  return { ...status }
}

export async function registerUser(username: string, password: string, remember: boolean): Promise<void> {
  const name = normalizeUsername(username)
  await registerLocalAccount(name, password)
  const account = getLocalAccount(name)!
  const key = await deriveAesKey(password, b64ToBuf(account.salt))
  await setLiveSession(name, key, remember)
  const payload = collectVaultPayload()
  const blob = await buildEncryptedBlob(name, password, payload)
  status.cloud = 'saving'
  status.cloudMessage = 'جاري الحفظ السحابي…'
  emit()
  const result = await pushCloud(blob)
  status.cloud = result.ok ? 'ok' : 'error'
  status.cloudMessage = result.message
  status.lastSavedAt = Date.now()
  lastFingerprint = vaultFingerprint(payload)
  emit()
  startAutoSync()
}

export async function loginUser(username: string, password: string, remember: boolean): Promise<void> {
  const name = normalizeUsername(username)
  const localAccount = getLocalAccount(name)

  // حساب موجود على هذا الجهاز لكن كلمة المرور خاطئة
  if (localAccount) {
    const localOk = await verifyLocalAccount(name, password)
    if (!localOk) {
      throw new Error('كلمة المرور غير صحيحة')
    }
    const key = await deriveAesKey(password, b64ToBuf(localAccount.salt))
    await setLiveSession(name, key, remember)
    const remote = await pullCloud(name)
    if (remote) {
      try {
        await restoreFromBlob(remote, password)
        status.cloudMessage = 'تم جلب أحدث البيانات من السحابة'
      } catch {
        // تجاهل نسخة سحابية تالفة
      }
    }
    status.cloud = 'ok'
    status.lastSavedAt = Date.now()
    lastFingerprint = vaultFingerprint(collectVaultPayload())
    emit()
    startAutoSync()
    return
  }

  // لا يوجد حساب محلي: حاول السحابة (جهاز آخر)
  const remote = await pullCloud(name)
  if (remote) {
    try {
      const { key } = await restoreFromBlob(remote, password)
      await setLiveSession(name, key, remember)
      status.cloud = 'ok'
      status.cloudMessage = 'تم استعادة البيانات من السحابة'
      status.lastSavedAt = Date.now()
      lastFingerprint = vaultFingerprint(collectVaultPayload())
      emit()
      startAutoSync()
      return
    } catch {
      throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة')
    }
  }

  // أول مرة على هذا الجهاز ولا توجد نسخة سحابية بعد
  throw new Error(
    'لا يوجد حساب بهذا الاسم على هذا الجهاز، والسحابة لا تحتوي نسخة بعد. اضغط «حساب جديد» لإنشائه هنا، أو استورد ملف النسخة الاحتياطية.',
  )
}

/** دخول، أو إنشاء الحساب تلقائياً إن لم يوجد محلياً ولا في السحابة */
export async function loginOrRegister(
  username: string,
  password: string,
  remember: boolean,
  allowCreate: boolean,
): Promise<'login' | 'register'> {
  try {
    await loginUser(username, password, remember)
    return 'login'
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (allowCreate && msg.includes('لا يوجد حساب')) {
      await registerUser(username, password, remember)
      return 'register'
    }
    throw err
  }
}

export async function loginFromDiskBlob(
  blob: import('./types').EncryptedBlob,
  password: string,
  remember: boolean,
): Promise<void> {
  const { key } = await restoreFromBlob(blob, password)
  await setLiveSession(blob.username, key, remember)
  status.disk = 'ok'
  status.cloudMessage = 'تم الاستيراد من الملف'
  status.lastSavedAt = Date.now()
  lastFingerprint = vaultFingerprint(collectVaultPayload())
  emit()
  // ادفع للسحابة إن أمكن
  void flushSync(true)
  startAutoSync()
}

export function logoutUser(): void {
  clearSession()
  stopAutoSync()
  status = {
    local: true,
    cloud: 'idle',
    cloudMessage: '',
    disk: 'none',
    lastSavedAt: null,
  }
  emit()
  window.location.reload()
}

export async function flushSync(force = false): Promise<void> {
  const session = getLiveSession()
  if (!session || syncing) return
  const payload = collectVaultPayload()
  const fp = vaultFingerprint(payload)
  if (!force && fp === lastFingerprint) return

  syncing = true
  status.cloud = 'saving'
  status.cloudMessage = 'جاري الحفظ التلقائي…'
  emit()

  try {
    const blob = await encryptCurrentVault(session.username, session.key)
    if (!blob) {
      status.cloud = 'error'
      status.cloudMessage = 'لا يوجد حساب محلي مرتبط'
      emit()
      return
    }

    const cloud = await pushCloud(blob)
    status.cloud = cloud.ok ? 'ok' : 'error'
    status.cloudMessage = cloud.message
    status.lastSavedAt = Date.now()
    lastFingerprint = fp

    const diskOk = await writeDiskHandle(blob)
    if (diskOk) status.disk = 'ok'

    // نسخة قرص تلقائية خفيفة عبر تنزيل فقط عند الطلب من الواجهة
  } finally {
    syncing = false
    emit()
  }
}

export function scheduleSync(): void {
  if (!getLiveSession()) return
  if (debounceTimer) window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    void flushSync(false)
  }, 1200)
}

export function exportBackupDownload(): void {
  const session = getLiveSession()
  if (!session) return
  void encryptCurrentVault(session.username, session.key).then((blob) => {
    if (blob) downloadDiskBackup(blob)
  })
}

function onDataChanged(ev: Event): void {
  const detail = (ev as CustomEvent<{ source?: string }>).detail
  if (detail?.source === 'cloud') {
    lastFingerprint = vaultFingerprint(collectVaultPayload())
    return
  }
  scheduleSync()
}

export function startAutoSync(): void {
  if (started) return
  started = true
  window.addEventListener(DATA_CHANGED_EVENT, onDataChanged)
  window.addEventListener('storage', scheduleSync)
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushSync(true)
  })
  window.setInterval(() => void flushSync(false), 30_000)
  lastFingerprint = vaultFingerprint(collectVaultPayload())
  void flushSync(true)
}

export function stopAutoSync(): void {
  started = false
  window.removeEventListener(DATA_CHANGED_EVENT, onDataChanged)
  window.removeEventListener('storage', scheduleSync)
  if (debounceTimer) window.clearTimeout(debounceTimer)
}
