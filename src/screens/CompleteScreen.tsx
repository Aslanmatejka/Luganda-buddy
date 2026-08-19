import { Mascot } from '../components/Mascot'

const CONFETTI = [
  { emoji: '🎉', top: '8%',  left: '10%',  cls: 'animate-confetti-a' },
  { emoji: '✨', top: '12%', left: '80%',  cls: 'animate-confetti-b' },
  { emoji: '🌟', top: '5%',  left: '45%',  cls: 'animate-confetti-c' },
  { emoji: '🎊', top: '20%', left: '22%',  cls: 'animate-confetti-b' },
  { emoji: '💜', top: '15%', left: '88%',  cls: 'animate-confetti-a' },
  { emoji: '🎈', top: '22%', left: '58%',  cls: 'animate-confetti-c' },
]

export function CompleteScreen({
  practiced,
  newlyLearned,
  categoryName,
  onHome,
  onAgain,
}: {
  practiced: number
  newlyLearned: number
  categoryName: string
  onHome: () => void
  onAgain: () => void
}) {
  const headline =
    newlyLearned > 0
      ? `You learned ${newlyLearned} new ${newlyLearned === 1 ? 'phrase' : 'phrases'}!`
      : `You practiced ${practiced} phrases. Solid!`

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col items-center overflow-hidden px-5 pb-14 pt-12 text-center">
      {/* Background glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-violet/20 blur-3xl" />

      {/* Confetti */}
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className={`pointer-events-none absolute text-2xl ${c.cls}`}
          style={{ top: c.top, left: c.left, animationDelay: `${i * 180}ms` }}
          aria-hidden="true"
        >
          {c.emoji}
        </span>
      ))}

      {/* Mascot */}
      <div className="animate-bounce-in relative z-10">
        <div className="absolute -inset-6 rounded-full bg-violet/20 blur-2xl" />
        <Mascot mood="cheer" size={114} />
      </div>

      {/* Text */}
      <div className="animate-pop stagger-1 relative z-10 mt-6 w-full">
        <h1 className="font-display text-[2.5rem] font-semibold leading-tight text-white">
          Lesson complete!
        </h1>
        <p className="mt-3 text-lg font-bold text-violet">{headline}</p>
        <p className="mt-2 mx-auto max-w-[260px] text-sm font-medium text-[#8b8b9e]">
          {categoryName} is a little friendlier now. Good work.
        </p>
      </div>

      {/* Stats */}
      <div className="animate-pop stagger-2 relative z-10 mt-7 flex w-full gap-3">
        <div className="flex-1 rounded-[18px] border border-white/8 bg-[#16161d] p-4">
          <p className="font-display text-3xl font-semibold text-white">{practiced}</p>
          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-[#5a5a72]">practiced</p>
        </div>
        <div className="flex-1 rounded-[18px] border border-emerald/25 bg-emerald/8 p-4">
          <p className="font-display text-3xl font-semibold text-emerald">{newlyLearned}</p>
          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-[#5a5a72]">new</p>
        </div>
      </div>

      {/* Buttons */}
      <div className="animate-pop stagger-3 relative z-10 mt-7 flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={onHome}
          className="animate-pulse-glow w-full rounded-2xl bg-violet px-5 py-4 text-[15px] font-bold text-white transition active:scale-[0.97]"
        >
          Back home 🏠
        </button>
        <button
          type="button"
          onClick={onAgain}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-[15px] font-bold text-white transition active:scale-[0.97]"
        >
          One more lesson ✨
        </button>
      </div>
    </div>
  )
}
