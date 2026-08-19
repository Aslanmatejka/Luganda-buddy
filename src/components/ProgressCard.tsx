import { WORD_GOAL } from '../data/content'
import { streakLabel } from '../lib/copy'
import type { Progress } from '../types'

export function ProgressCard({ progress }: { progress: Progress }) {
  const learned = progress.learnedIds.length
  const percent = Math.min(100, Math.round((learned / WORD_GOAL) * 100))
  const fill = Math.max(percent, learned > 0 ? 4 : 0)
  const streak = progress.streak

  return (
    <section className="gradient-border relative overflow-hidden rounded-[22px] bg-[#16161d] p-5">
      {/* bg glow */}
      <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-violet/10 blur-2xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#5a5a72]">
            Your journey
          </p>
          <p className="mt-1 font-display text-4xl font-semibold text-white">
            {learned}
            <span className="text-lg font-medium text-[#5a5a72]"> / {WORD_GOAL}</span>
          </p>
          <p className="text-xs font-semibold text-[#8b8b9e]">words learned</p>
        </div>

        {streak > 0 && (
          <div className="flex flex-col items-center rounded-2xl bg-amber/10 border border-amber/20 px-4 py-3">
            <span className="animate-streak font-display text-3xl font-bold text-amber leading-none">
              {streak}
            </span>
            <span className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber/70">
              {streak === 1 ? 'day' : 'days'} 🔥
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet to-coral transition-all duration-1000 ease-out"
          style={{ width: `${fill}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <p className="text-xs font-semibold text-[#5a5a72]">{streakLabel(progress)}</p>
        <p className="text-xs font-bold text-[#5a5a72]">{percent}%</p>
      </div>
    </section>
  )
}
