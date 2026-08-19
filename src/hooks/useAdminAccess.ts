/**
 * Admin access — no login required.
 *
 * Flow:
 * 1. Check localStorage for a previously granted flag (instant, synchronous).
 * 2. If not found, verify against Supabase: does the admin_access row for
 *    aslanabdulkarim84@gmail.com have this device_id?  If yes, grant locally.
 * 3. To claim admin for the first time, the user enters their email in a tiny
 *    prompt.  If it matches the authorised email and the row doesn't exist yet,
 *    we insert it and grant access permanently on this device.
 */

import { useCallback, useEffect, useState } from 'react'
import { supabase, getDeviceId } from '../lib/supabase'

const ADMIN_EMAIL = 'aslanabdulkarim84@gmail.com'
const LS_KEY = 'luganda-buddy-is-admin'

function readLocalFlag(): boolean {
  return localStorage.getItem(LS_KEY) === '1'
}

function setLocalFlag(): void {
  localStorage.setItem(LS_KEY, '1')
}

type Status = 'checking' | 'granted' | 'denied'

export function useAdminAccess() {
  const [status, setStatus] = useState<Status>(readLocalFlag() ? 'granted' : 'checking')

  // On mount, verify against Supabase unless already locally granted
  useEffect(() => {
    if (status === 'granted') return
    if (!supabase) { setStatus('denied'); return }

    void Promise.resolve(
      supabase
        .from('admin_access')
        .select('device_id')
        .eq('email', ADMIN_EMAIL)
        .maybeSingle(),
    ).then(({ data }) => {
      if (data && (data as { device_id: string }).device_id === getDeviceId()) {
        setLocalFlag()
        setStatus('granted')
      } else {
        setStatus('denied')
      }
    }).catch(() => setStatus('denied'))
  }, [status])

  /**
   * Called from the claim modal.  Inserts the row if the email matches and
   * the slot is unclaimed, then grants access on this device.
   * Returns 'granted' | 'wrong_email' | 'already_claimed' | 'error'.
   */
  const claimAdmin = useCallback(async (email: string): Promise<'granted' | 'wrong_email' | 'already_claimed' | 'error'> => {
    const trimmed = email.trim().toLowerCase()
    if (trimmed !== ADMIN_EMAIL) return 'wrong_email'
    if (!supabase) return 'error'

    // Check if already claimed by another device
    const { data: existing } = await supabase
      .from('admin_access')
      .select('device_id')
      .eq('email', ADMIN_EMAIL)
      .maybeSingle()

    if (existing) {
      // Row exists — grant if it's this device, reject otherwise
      if ((existing as { device_id: string }).device_id === getDeviceId()) {
        setLocalFlag()
        setStatus('granted')
        return 'granted'
      }
      return 'already_claimed'
    }

    // Claim it
    const { error } = await supabase
      .from('admin_access')
      .insert({ email: ADMIN_EMAIL, device_id: getDeviceId() })

    if (error) return 'error'

    setLocalFlag()
    setStatus('granted')
    return 'granted'
  }, [])

  return { isAdmin: status === 'granted', isChecking: status === 'checking', claimAdmin }
}
