import { exportKeyJwk, importKeyJwk } from './crypto'
import {
  KEY_MATERIAL_KEY,
  REMEMBER_KEY,
  SESSION_KEY,
  type SessionInfo,
} from './types'

type LiveSession = {
  username: string
  key: CryptoKey
}

let live: LiveSession | null = null

function storageFor(remember: boolean): Storage {
  return remember ? localStorage : sessionStorage
}

export function getLiveSession(): LiveSession | null {
  return live
}

export async function setLiveSession(
  username: string,
  key: CryptoKey,
  remember: boolean,
): Promise<void> {
  live = { username, key }
  const info: SessionInfo = { username, remember }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(info))
  if (remember) {
    localStorage.setItem(REMEMBER_KEY, JSON.stringify(info))
  } else {
    localStorage.removeItem(REMEMBER_KEY)
  }
  const jwk = await exportKeyJwk(key)
  storageFor(remember).setItem(KEY_MATERIAL_KEY, JSON.stringify({ username, jwk }))
  if (!remember) {
    localStorage.removeItem(KEY_MATERIAL_KEY)
  } else {
    sessionStorage.setItem(KEY_MATERIAL_KEY, JSON.stringify({ username, jwk }))
  }
}

export async function restoreSession(): Promise<LiveSession | null> {
  if (live) return live
  const remembered = localStorage.getItem(REMEMBER_KEY) || sessionStorage.getItem(SESSION_KEY)
  if (!remembered) return null
  let info: SessionInfo
  try {
    info = JSON.parse(remembered) as SessionInfo
  } catch {
    return null
  }
  const raw =
    storageFor(!!info.remember).getItem(KEY_MATERIAL_KEY) ||
    sessionStorage.getItem(KEY_MATERIAL_KEY) ||
    localStorage.getItem(KEY_MATERIAL_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { username: string; jwk: JsonWebKey }
    if (parsed.username !== info.username) return null
    const key = await importKeyJwk(parsed.jwk)
    live = { username: parsed.username, key }
    return live
  } catch {
    return null
  }
}

export function clearSession(): void {
  live = null
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(KEY_MATERIAL_KEY)
  localStorage.removeItem(REMEMBER_KEY)
  localStorage.removeItem(KEY_MATERIAL_KEY)
}

export function requireSession(): LiveSession {
  if (!live) throw new Error('يجب تسجيل الدخول أولاً')
  return live
}
