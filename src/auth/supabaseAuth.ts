import { getSupabase, isSupabaseConfigured, usernameToEmail } from './supabaseClient'
import { clearUsername, loadUsername, saveUsername } from './meta'
import { pullAndMerge, pushLocal, startSyncEngine, stopSyncEngine } from './syncEngine'

export async function registerUser(username: string, password: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('قاعدة البيانات غير مربوطة بعد. أنشئ مشروع Supabase وأضف المفاتيح.')
  }
  if (!navigator.onLine) {
    throw new Error('إنشاء الحساب يحتاج إنترنت لأول مرة')
  }
  const name = username.trim().toLowerCase()
  if (name.length < 3) throw new Error('اسم المستخدم يجب أن يكون 3 أحرف على الأقل')
  if (password.length < 4) throw new Error('كلمة المرور يجب أن تكون 4 أحرف على الأقل')

  const supabase = getSupabase()
  const email = usernameToEmail(name)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username: name } },
  })
  if (error) throw new Error(error.message)
  const user = data.user
  if (!user) throw new Error('تعذر إنشاء الحساب')

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id,
    username: name,
  })
  if (profileError) throw new Error(profileError.message)

  saveUsername(name)
  await pushLocal(true)
  startSyncEngine(name)
}

export async function loginUser(username: string, password: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('قاعدة البيانات غير مربوطة بعد. أنشئ مشروع Supabase وأضف المفاتيح.')
  }
  if (!navigator.onLine) {
    throw new Error('أول دخول لهذا الجهاز يحتاج إنترنت، بعدها يعمل بدون نت')
  }
  const name = username.trim().toLowerCase()
  const supabase = getSupabase()
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(name),
    password,
  })
  if (error) {
    if (/invalid login/i.test(error.message)) {
      throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة')
    }
    throw new Error(error.message)
  }
  saveUsername(name)
  await pullAndMerge()
  await pushLocal(false)
  startSyncEngine(name)
}

export async function logoutUser(): Promise<void> {
  stopSyncEngine()
  clearUsername()
  if (isSupabaseConfigured()) {
    try {
      await getSupabase().auth.signOut()
    } catch {
      // ignore
    }
  }
  window.location.reload()
}

export async function restoreAuthSession(): Promise<{ username: string } | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getSupabase()
  const { data } = await supabase.auth.getSession()
  if (!data.session) return null
  const username =
    loadUsername() ||
    (data.session.user.user_metadata?.username as string | undefined) ||
    data.session.user.email?.split('@')[0] ||
    'user'
  saveUsername(username)
  startSyncEngine(username)
  if (navigator.onLine) {
    void pullAndMerge().then(() => pushLocal(false))
  }
  return { username }
}

export function getCachedUsername(): string | null {
  return loadUsername()
}
