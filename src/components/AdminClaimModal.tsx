import { useState } from 'react'

type Result = 'granted' | 'wrong_email' | 'already_claimed' | 'error'

export function AdminClaimModal({
  onClaim,
  onDismiss,
}: {
  onClaim: (email: string) => Promise<Result>
  onDismiss: () => void
}) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const result = await onClaim(email)
    setBusy(false)
    if (result === 'granted') {
      setSuccess(true)
    } else if (result === 'wrong_email') {
      setMsg("That's not the right email. Only Aslan can claim admin.")
    } else if (result === 'already_claimed') {
      setMsg('Admin is already claimed on another device.')
    } else {
      setMsg('Something went wrong. Try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center">
      <div className="animate-pop w-full max-w-sm rounded-t-[28px] bg-cream p-6 pb-10 sm:rounded-[28px]">
        {success ? (
          <div className="text-center">
            <p className="text-4xl">🎉</p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-ink">
              Admin unlocked!
            </h2>
            <p className="mt-2 text-sm font-semibold text-muted">
              This device is now permanently the admin.
            </p>
            <button
              type="button"
              onClick={onDismiss}
              className="mt-6 w-full rounded-2xl bg-coral px-4 py-3 font-extrabold text-white"
            >
              Let's go
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-ink">
                Admin access
              </h2>
              <button type="button" onClick={onDismiss} className="text-2xl text-muted">
                ×
              </button>
            </div>
            <p className="mb-4 text-sm font-semibold text-muted">
              Enter your email to unlock admin. Only one person can claim this.
            </p>
            <form onSubmit={handle} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
                className="w-full rounded-xl border border-peach bg-card px-4 py-3 text-base font-semibold text-ink placeholder:text-muted/40 focus:outline-none focus:ring-2 focus:ring-coral/40"
              />
              {msg && (
                <p className="text-sm font-bold text-coral">{msg}</p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl bg-ink px-4 py-3 font-extrabold text-cream disabled:opacity-50"
              >
                {busy ? 'Checking…' : 'Claim admin'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
