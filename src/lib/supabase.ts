import { createClient } from '@supabase/supabase-js'
import { safeDeviceId } from './storageSafe'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  console.warn('[Luganda Buddy] Supabase env vars missing — running in offline mode.')
}

export const supabase = url && key ? createClient(url, key) : null

const DEVICE_KEY = 'luganda-buddy-device-id'

export function getDeviceId(): string {
  return safeDeviceId(DEVICE_KEY)
}
