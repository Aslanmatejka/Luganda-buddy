import { useAudioUrl } from '../hooks/useAudioUrl'
import type { Phrase } from '../types'

export function ChallengeCard({ phrase }: { phrase: Phrase }) {
  const { url: audioUrl } = useAudioUrl(phrase.id)

  const play = () => {
    if (audioUrl) new Audio(audioUrl).play().catch(() => {})
  }

  return (
    <section className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-violet/30 via-[#1a1228] to-coral/20 border border-violet/25 p-5">
      {/* glow blobs */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-violet/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-coral/15 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-sm">😄</span>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-violet/80">
            Challenge from Aslan
          </p>
        </div>

        <button
          type="button"
          onClick={play}
          className="group flex items-center gap-3 rounded-2xl bg-white/8 border border-white/10 px-4 py-3 transition active:scale-[0.97] active:bg-white/12"
        >
          <span className="font-display text-2xl font-semibold text-white leading-tight">
            {phrase.luganda}
          </span>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet/30 text-sm">
            🔊
          </span>
        </button>

        <p className="mt-3 text-sm font-semibold text-white/80">
          Say this to Aslan today.
        </p>
        <p className="mt-1 text-xs font-medium text-white/40">
          "{phrase.english}" — one real try is enough.
        </p>
      </div>
    </section>
  )
}
