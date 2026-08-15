import {
  b64ToBuf,
  bufToB64,
  decryptJson,
  deriveAesKey,
  encryptJson,
  hashPassword,
  randomSalt,
} from './crypto'
import { ensureLocalAccountRecord, getLocalAccount, normalizeUsername } from './accounts'
import { KVDB_BUCKET, PUTER_KEY_PREFIX, type EncryptedBlob, type VaultPayload } from './types'
import { applyVaultPayload, collectVaultPayload } from './vault'

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

let puterLoading: Promise<void> | null = null

async function ensurePuter(): Promise<boolean> {
  if (window.puter?.kv) return true
  if (!puterLoading) {
    puterLoading = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-puter]')
      if (existing) {
        existing.addEventListener('load', () => resolve())
        existing.addEventListener('error', () => reject(new Error('فشل تحميل Puter')))
        return
      }
      const script = document.createElement('script')
      script.src = 'https://js.puter.com/v2/'
      script.async = true
      script.dataset.puter = '1'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('فشل تحميل Puter'))
      document.head.appendChild(script)
    }).catch(() => {
      puterLoading = null
    })
  }
  try {
    await puterLoading
  } catch {
    return false
  }
  return Boolean(window.puter?.kv)
}

export async function buildEncryptedBlob(
  username: string,
  password: string,
  payload: VaultPayload,
): Promise<EncryptedBlob> {
  const existing = getLocalAccount(username)
  const salt = existing ? b64ToBuf(existing.salt) : await randomSalt(16)
  const key = await deriveAesKey(password, salt)
  const { iv, ciphertext } = await encryptJson(payload, key)
  if (!existing) {
    const hash = await hashPassword(password, salt)
    ensureLocalAccountRecord(username, {
      salt: bufToB64(salt),
      hash,
      createdAt: Date.now(),
    })
  }
  return {
    v: 1,
    username: normalizeUsername(username),
    salt: bufToB64(salt),
    iv,
    ciphertext,
    updatedAt: payload.updatedAt,
  }
}

export async function buildEncryptedBlobWithKey(
  username: string,
  key: CryptoKey,
  saltB64: string,
  payload: VaultPayload,
): Promise<EncryptedBlob> {
  const { iv, ciphertext } = await encryptJson(payload, key)
  return {
    v: 1,
    username: normalizeUsername(username),
    salt: saltB64,
    iv,
    ciphertext,
    updatedAt: payload.updatedAt,
  }
}

export async function openEncryptedBlob(
  blob: EncryptedBlob,
  password: string,
): Promise<{ payload: VaultPayload; key: CryptoKey }> {
  const salt = b64ToBuf(blob.salt)
  const key = await deriveAesKey(password, salt)
  const payload = await decryptJson<VaultPayload>(blob.ciphertext, blob.iv, key)
  const hash = await hashPassword(password, salt)
  ensureLocalAccountRecord(blob.username, {
    salt: blob.salt,
    hash,
    createdAt: Date.now(),
  })
  return { payload, key }
}

export async function openEncryptedBlobWithKey(
  blob: EncryptedBlob,
  key: CryptoKey,
): Promise<VaultPayload> {
  return decryptJson<VaultPayload>(blob.ciphertext, blob.iv, key)
}

function vaultKey(username: string): string {
  return `${PUTER_KEY_PREFIX}${normalizeUsername(username)}`
}

export async function cloudPutPuter(blob: EncryptedBlob): Promise<{ ok: boolean; message: string }> {
  const ready = await ensurePuter()
  if (!ready || !window.puter?.kv) {
    return { ok: false, message: 'تعذر الاتصال بالسحابة (Puter)' }
  }
  try {
    if (window.puter.auth && !window.puter.auth.isSignedIn()) {
      await window.puter.auth.signIn()
    }
    await window.puter.kv.set(vaultKey(blob.username), JSON.stringify(blob))
    return { ok: true, message: 'حُفظت على سحابة Puter' }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'فشل الحفظ على Puter',
    }
  }
}

export async function cloudGetPuter(username: string): Promise<EncryptedBlob | null> {
  const ready = await ensurePuter()
  if (!ready || !window.puter?.kv) return null
  try {
    if (window.puter.auth && !window.puter.auth.isSignedIn()) {
      await window.puter.auth.signIn()
    }
    const raw = await window.puter.kv.get(vaultKey(username))
    if (!raw) return null
    return JSON.parse(raw) as EncryptedBlob
  } catch {
    return null
  }
}

export async function cloudPutKvdb(blob: EncryptedBlob): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`https://kvdb.io/${KVDB_BUCKET}/vault-${normalizeUsername(blob.username)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blob),
    })
    if (res.status === 403) {
      return {
        ok: false,
        message: 'السحابة تحتاج تأكيد البريد على kvdb.io',
      }
    }
    if (!res.ok) {
      return { ok: false, message: `فشل kvdb (${res.status})` }
    }
    return { ok: true, message: 'حُفظت على السحابة (kvdb)' }
  } catch {
    return { ok: false, message: 'تعذر الوصول إلى kvdb' }
  }
}

export async function cloudGetKvdb(username: string): Promise<EncryptedBlob | null> {
  try {
    const res = await fetch(`https://kvdb.io/${KVDB_BUCKET}/vault-${normalizeUsername(username)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const text = await res.text()
    if (!text) return null
    return JSON.parse(text) as EncryptedBlob
  } catch {
    return null
  }
}

export async function pushCloud(blob: EncryptedBlob): Promise<{ ok: boolean; message: string }> {
  const kv = await cloudPutKvdb(blob)
  if (kv.ok) return kv
  const puter = await cloudPutPuter(blob)
  if (puter.ok) return puter
  return {
    ok: false,
    message: `${kv.message} · ${puter.message}`,
  }
}

export async function pullCloud(username: string): Promise<EncryptedBlob | null> {
  const fromKv = await cloudGetKvdb(username)
  if (fromKv) return fromKv
  return cloudGetPuter(username)
}

export function downloadDiskBackup(blob: EncryptedBlob): void {
  const file = new Blob([JSON.stringify(blob, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = `fars-backup-${blob.username}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function readDiskBackupFile(file: File): Promise<EncryptedBlob> {
  const text = await file.text()
  return JSON.parse(text) as EncryptedBlob
}

type FilePickerWindow = Window & {
  showSaveFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle>
  showOpenFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle[]>
}

let diskHandle: FileSystemFileHandle | null = null

export function getDiskHandle(): FileSystemFileHandle | null {
  return diskHandle
}

export async function pickDiskFileForSave(): Promise<FileSystemFileHandle | null> {
  const w = window as FilePickerWindow
  if (!w.showSaveFilePicker) return null
  try {
    diskHandle = await w.showSaveFilePicker({
      suggestedName: 'fars-backup.json',
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
    })
    return diskHandle
  } catch {
    return null
  }
}

export async function pickDiskFileForOpen(): Promise<EncryptedBlob | null> {
  const w = window as FilePickerWindow
  if (!w.showOpenFilePicker) return null
  try {
    const [handle] = await w.showOpenFilePicker({
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      multiple: false,
    })
    if (!handle) return null
    diskHandle = handle
    const file = await handle.getFile()
    return readDiskBackupFile(file)
  } catch {
    return null
  }
}

export async function writeDiskHandle(blob: EncryptedBlob): Promise<boolean> {
  if (!diskHandle) return false
  try {
    const writable = await diskHandle.createWritable()
    await writable.write(JSON.stringify(blob, null, 2))
    await writable.close()
    return true
  } catch {
    return false
  }
}

export async function encryptCurrentVault(
  username: string,
  key: CryptoKey,
): Promise<EncryptedBlob | null> {
  const account = getLocalAccount(username)
  if (!account) return null
  const payload = collectVaultPayload()
  return buildEncryptedBlobWithKey(username, key, account.salt, payload)
}

export async function restoreFromBlob(blob: EncryptedBlob, password: string) {
  const { payload, key } = await openEncryptedBlob(blob, password)
  applyVaultPayload(payload)
  return { payload, key }
}
