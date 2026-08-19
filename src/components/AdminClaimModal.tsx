import { useState } from 'react'

type Result = 'granted' | 'wrong_credentials' | 'error'

export function AdminClaimModal({
  onSignIn,
  onDismiss,
}: {
  onSignIn: (email: string, password: string) => Promise<Result>
  onDismiss: () => void
}) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy]         = useState(false)
  const [msg, setMsg]           = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const result = await onSignIn(email, password)
    setBusy(false)
    if (result === 'granted') {
      setSuccess(true)
    } else if (result === 'wrong_credentials') {
      setMsg('Incorrect email or password.')
    } else {
      setMsg('Something went wrong. Try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-md sm:items-center">
      <div className="animate-pop w-full max-w-sm rounded-t-[28px] border border-white/10 bg-[#16161d] p-6 pb-10 sm:rounded-[28px]">
        {success ? (
          <div className="text-center">
            <p className="text-4xl">🔓</p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-white">
              Admin unlocked
            </h2>
            <p className="mt-2 text-sm font-medium text-[#8b8b9e]">
              You can now edit phrases and recordings.
            </p>
            <button
              type="button"
              onClick={onDismiss}
              className="mt-6 w-full rounded-2xl bg-violet px-4 py-3 font-bold text-white"
            >
              Let's go
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-white">
                Admin sign in
              </h2>
              <button
                type="button"
                onClick={onDismiss}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-[#8b8b9e]"
              >
                ×
              </button>
            </div>

            <form onSubmit={handle} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder:text-[#5a5a72] focus:border-violet/50 focus:outline-none focus:ring-2 focus:ring-violet/20"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder:text-[#5a5a72] focus:border-violet/50 focus:outline-none focus:ring-2 focus:ring-violet/20"
              />

              {msg && (
                <p className="text-sm font-bold text-rose">{msg}</p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-1 w-full rounded-2xl bg-violet px-4 py-3 font-bold text-white disabled:opacity-50"
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
