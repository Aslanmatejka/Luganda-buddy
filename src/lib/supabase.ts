import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  console.warn('[Luganda Buddy] Supabase env vars missing — running in offline mode.')
}

export const supabase = url && key ? createClient(url, key) : null

// ── Device ID ──────────────────────────────────────────────────────────────────
// A stable random UUID stored in localStorage so one browser = one "learner"
// without requiring a login.

const DEVICE_KEY = 'luganda-buddy-device-id'

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}
