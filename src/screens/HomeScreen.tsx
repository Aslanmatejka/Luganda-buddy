import { phrases } from '../data/content'
import { dailyChallenge, todaysCategory } from '../services/lesson'
import { ChallengeCard } from '../components/ChallengeCard'
import { CategoryGrid } from '../components/CategoryGrid'
import { Mascot } from '../components/Mascot'
import { ProgressCard } from '../components/ProgressCard'
import { WordsOfDayCard } from '../components/WordsOfDayCard'
import { todaysMotivation } from '../lib/copy'
import type { CategoryId, Progress } from '../types'

export function HomeScreen({
  progress,
  onStart,
}: {
  progress: Progress
  onStart: (categoryId?: CategoryId) => void
}) {
  const today = todaysCategory()
  const allLearned = progress.learnedIds.length >= phrases.length

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 px-4 pb-14 pt-7">

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="animate-pop flex items-center justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#5a5a72]">
            Luganda Buddy
          </p>
          <h1 className="mt-1 font-display text-[1.9rem] font-semibold leading-tight text-white">
            Wasuze otya 👋
          </h1>
          <p className="mt-0.5 text-sm font-medium text-[#8b8b9e]">
            {todaysMotivation()}
          </p>
        </div>
        <Mascot size={76} className="shrink-0" />
      </header>

      {/* ── Today's Lesson hero card ───────────────────────────────── */}
      <section className="animate-pop stagger-1 noise relative overflow-hidden rounded-[24px] bg-gradient-to-br from-violet via-purple-700 to-coral-deep p-5 shadow-[0_20px_60px_rgba(139,92,246,0.35)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.25),transparent_60%)]" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="rounded-lg bg-white/20 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white/80">
              {allLearned ? '🎓 Complete' : "Today's lesson"}
            </span>
          </div>
          <p className="font-display text-[1.6rem] font-semibold leading-tight text-white">
            {today.emoji} {today.name}
          </p>
          <p className="mt-1 text-sm font-medium text-white/60">
            5 phrases · 2 minutes · easy
          </p>
          <button
            type="button"
            onClick={() => onStart(today.id)}
            className="mt-5 flex w-full items-center justify-between rounded-xl bg-white/20 px-4 py-3.5 font-bold text-white backdrop-blur-sm transition active:bg-white/30 active:scale-[0.98]"
          >
            <span className="text-[15px]">Start Lesson</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-sm">→</span>
          </button>
        </div>
      </section>

      {/* ── Progress ──────────────────────────────────────────────── */}
      <div className="animate-pop stagger-2">
        <ProgressCard progress={progress} />
      </div>

      {/* ── Words of the day ──────────────────────────────────────── */}
      <div className="animate-pop stagger-3">
        <WordsOfDayCard />
      </div>

      {/* ── Challenge ─────────────────────────────────────────────── */}
      <div className="animate-pop stagger-4">
        <ChallengeCard phrase={dailyChallenge(progress.learnedIds)} />
      </div>

      {/* ── Categories ────────────────────────────────────────────── */}
      <div className="animate-pop stagger-5">
        <CategoryGrid onChoose={onStart} />
      </div>

      {/* ── Signature ─────────────────────────────────────────────── */}
      <footer className="mt-4 text-center">
        <p className="text-[11px] font-semibold text-[#3a3a50]">
          Made with love by the family of the heart
        </p>
        <p className="mt-0.5 font-display text-sm font-semibold text-violet/50">
          for Mrs. Matejka ❤️
        </p>
      </footer>
    </div>
  )
}
