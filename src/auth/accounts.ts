import { hashPassword, randomSalt, bufToB64, b64ToBuf } from './crypto'
import { ACCOUNTS_KEY, type AccountsFile, type LocalAccount } from './types'

function emptyAccounts(): AccountsFile {
  return { v: 1, users: {} }
}

export function loadAccounts(): AccountsFile {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return emptyAccounts()
    const parsed = JSON.parse(raw) as AccountsFile
    return { v: 1, users: parsed.users ?? {} }
  } catch {
    return emptyAccounts()
  }
}

export function saveAccounts(file: AccountsFile): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(file))
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export async function registerLocalAccount(username: string, password: string): Promise<LocalAccount> {
  const name = normalizeUsername(username)
  if (name.length < 3) throw new Error('اسم المستخدم يجب أن يكون 3 أحرف على الأقل')
  if (password.length < 4) throw new Error('كلمة المرور يجب أن تكون 4 أحرف على الأقل')
  const file = loadAccounts()
  if (file.users[name]) throw new Error('اسم المستخدم مسجّل مسبقاً على هذا الجهاز')
  const salt = await randomSalt(16)
  const hash = await hashPassword(password, salt)
  const account: LocalAccount = {
    salt: bufToB64(salt),
    hash,
    createdAt: Date.now(),
  }
  file.users[name] = account
  saveAccounts(file)
  return account
}

export async function verifyLocalAccount(username: string, password: string): Promise<boolean> {
  const name = normalizeUsername(username)
  const account = loadAccounts().users[name]
  if (!account) return false
  const hash = await hashPassword(password, b64ToBuf(account.salt))
  return hash === account.hash
}

export function ensureLocalAccountRecord(username: string, account: LocalAccount): void {
  const name = normalizeUsername(username)
  const file = loadAccounts()
  file.users[name] = account
  saveAccounts(file)
}

export function getLocalAccount(username: string): LocalAccount | null {
  return loadAccounts().users[normalizeUsername(username)] ?? null
}
