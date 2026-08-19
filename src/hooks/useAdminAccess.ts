/**
 * Admin sign-in — works on any device.
 *
 * Flow:
 * 1. On load: check localStorage for a previously granted session token.
 * 2. If token exists: verify it against Supabase (token column in admin_access).
 * 3. To sign in: enter email + password.  We compare the password against the
 *    bcrypt hash stored in admin_access.  On match, save a random session token
 *    to localStorage and to Supabase so any future device check can verify it.
 *
 * Why not real auth?  Because the app has no user accounts at all.  This tiny
 * hidden sign-in is purely so Aslan can edit phrases from any device.
 */

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { safeGetItem, safeRemoveItem, safeSetItem } from '../lib/storageSafe'

const ADMIN_EMAIL = 'aslanabdulkarim84@gmail.com'
const LS_KEY      = 'luganda-buddy-admin-token'

function getSavedToken(): string | null {
  return safeGetItem(LS_KEY)
}
function saveToken(token: string): void {
  safeSetItem(LS_KEY, token)
}
function clearToken(): void {
  safeRemoveItem(LS_KEY)
}

type Status = 'checking' | 'granted' | 'denied'

export function useAdminAccess() {
  const [status, setStatus] = useState<Status>(getSavedToken() ? 'checking' : 'denied')

  // Verify saved token against Supabase on mount
  useEffect(() => {
    const token = getSavedToken()
    if (!token) { setStatus('denied'); return }
    if (!supabase) { setStatus('denied'); return }

    void Promise.resolve(
      supabase
        .from('admin_access')
        .select('token')
        .eq('email', ADMIN_EMAIL)
        .maybeSingle()
    ).then(({ data }) => {
      if (data && (data as { token: string }).token === token) {
        setStatus('granted')
      } else {
        clearToken()
        setStatus('denied')
      }
    }).catch(() => {
      // Offline — trust the local token
      setStatus('granted')
    })
  }, [])

  /**
   * Sign in with email + password.
   * The password is checked server-side by comparing against a stored hash
   * via a Supabase RPC function `verify_admin_password(p_email, p_password)`.
   * Returns true/false.  On success, a fresh session token is written.
   */
  const signIn = useCallback(async (email: string, password: string): Promise<
    'granted' | 'wrong_credentials' | 'error'
  > => {
    const trimmedEmail = email.trim().toLowerCase()
    if (trimmedEmail !== ADMIN_EMAIL) return 'wrong_credentials'
    if (!supabase) return 'error'

    // Call Supabase RPC that compares the password hash
    const { data, error } = await supabase.rpc('verify_admin_password', {
      p_email:    trimmedEmail,
      p_password: password,
    })

    if (error || !data) return 'wrong_credentials'

    // Generate a session token and persist it
    const token = crypto.randomUUID()
    saveToken(token)

    // Update the token in Supabase so other devices can verify
    await supabase
      .from('admin_access')
      .update({ token })
      .eq('email', trimmedEmail)

    setStatus('granted')
    return 'granted'
  }, [])

  const signOut = useCallback(() => {
    clearToken()
    setStatus('denied')
  }, [])

  return {
    isAdmin:    status === 'granted',
    isChecking: status === 'checking',
    signIn,
    signOut,
  }
}
