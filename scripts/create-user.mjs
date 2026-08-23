#!/usr/bin/env node
/**
 * إنشاء مستخدم بدون إيميل (يتجاوز حد البريد)
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=sb_secret_... node scripts/create-user.mjs <username> <password>
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL || 'https://mzouyhqnaeouvngigggm.supabase.co'
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
const username = (process.argv[2] || '').trim().toLowerCase()
const password = process.argv[3] || ''

if (!secret) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (username.length < 3 || password.length < 4) {
  console.error('Usage: node scripts/create-user.mjs <username> <password>')
  process.exit(1)
}

const email = `${username.replace(/[^a-z0-9._-]/g, '')}@fars.app`
const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { username },
})
if (error) {
  console.error(error.message)
  process.exit(1)
}
const id = data.user.id
const { error: pErr } = await admin.from('profiles').upsert({ id, username })
if (pErr) {
  console.error(pErr.message)
  process.exit(1)
}
console.log(`OK user=${username} id=${id}`)
