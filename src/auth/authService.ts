import { isSupabaseConfigured } from './supabaseClient'
import * as supabaseAuth from './supabaseAuth'
import * as localBackend from './localBackend'
import { loadUsername } from './meta'
import type { SyncStatus } from './types'
import {
  subscribeSync as subSupabase,
  getSyncStatus as getSupabaseStatus,
  flushSync as flushSupabase,
} from './syncEngine'
import {
  subscribeSync as subLocal,
  getSyncStatus as getLocalStatus,
  flushLocalSync,
} from './localBackend'

export function usingSupabase(): boolean {
  return isSupabaseConfigured()
}

export async function registerUser(username: string, password: string): Promise<void> {
  if (usingSupabase()) return supabaseAuth.registerUser(username, password)
  return localBackend.registerLocalUser(username, password)
}

export async function loginUser(username: string, password: string): Promise<void> {
  if (usingSupabase()) return supabaseAuth.loginUser(username, password)
  return localBackend.loginLocalUser(username, password)
}

export async function logoutUser(): Promise<void> {
  if (usingSupabase()) return supabaseAuth.logoutUser()
  return localBackend.logoutLocalUser()
}

export async function restoreAuthSession(): Promise<{ username: string } | null> {
  if (usingSupabase()) return supabaseAuth.restoreAuthSession()
  return localBackend.restoreLocalSession()
}

export function getCachedUsername(): string | null {
  return loadUsername()
}

export function subscribeSync(listener: (s: SyncStatus) => void): () => void {
  return usingSupabase() ? subSupabase(listener) : subLocal(listener)
}

export function getSyncStatus(): SyncStatus {
  return usingSupabase() ? getSupabaseStatus() : getLocalStatus()
}

export async function flushSync(): Promise<void> {
  if (usingSupabase()) return flushSupabase()
  return flushLocalSync(true)
}
