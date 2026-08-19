import { useState } from 'react'
import { wordsOfDay } from '../services/lesson'
import { idbLoadAudio } from '../services/audioDB'
import type { Phrase } from '../types'

const ACCENTS = [
  { border: 'border-violet/30', glow: 'bg-violet/8', tag: 'bg-violet/20 text-violet' },
  { border: 'border-emerald/30', glow: 'bg-emerald/8', tag: 'bg-emerald/20 text-emerald' },
  { border: 'border-coral/30', glow: 'bg-coral/8', tag: 'bg-coral/20 text-coral' },
]

function WordChip({
  phrase,
  accent,
  delay,
}: {
  phrase: Phrase
  accent: (typeof ACCENTS)[number]
  delay: string
}) {
  const [flipped, setFlipped] = useState(false)
  const [animating, setAnimating] = useState(false)
  const flip = () => {
    if (animating) return
    setAnimating(true)
    setTimeout(() => setFlipped((f) => !f), 180)
    setTimeout(() => setAnimating(false), 370)
  }

  const speak = (e: React.MouseEvent) => {
    e.stopPropagation()
    idbLoadAudio(phrase.id).then((url) => {
      if (url) new Audio(url).play().catch(() => {})
    }).catch(() => {})
  }

  return (
    <div
      className={`animate-slide-up group relative flex flex-1 flex-col items-center overflow-hidden rounded-[18px] border ${accent.border} bg-[#1e1e28] p-3.5 text-center`}
      style={{ animationDelay: delay }}
    >
      {/* colour wash */}
      <div className={`pointer-events-none absolute inset-0 ${accent.glow} opacity-60`} />

      <button
        type="button"
        onClick={flip}
        className="relative flex w-full flex-1 flex-col items-center transition-transform active:scale-[0.95]"
        title="Tap to flip"
      >
        <div className={animating ? (flipped ? 'flip-enter' : 'flip-exit') : ''}>
          {!flipped ? (
            <>
              <p className="font-display text-[16px] font-semibold leading-snug text-white">
                {phrase.luganda}
              </p>
              <p className="mt-1 text-[10px] font-bold text-[#5a5a72]">
                {phrase.pronunciation}
              </p>
              <p className="mt-2.5 text-[9px] font-extrabold uppercase tracking-widest text-[#5a5a72]">
                tap
              </p>
            </>
          ) : (
            <>
              <p className="text-[14px] font-extrabold text-white">
                {phrase.english}
              </p>
              <p className="mt-1.5 text-[10px] font-semibold leading-snug text-[#8b8b9e]">
                {phrase.explanation.length > 55
                  ? phrase.explanation.slice(0, 53) + '…'
                  : phrase.explanation}
              </p>
            </>
          )}
        </div>
      </button>

      <button
        type="button"
        onClick={speak}
        className={`relative mt-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${accent.tag}`}
      >
        🔊 Hear
      </button>
    </div>
  )
}

export function WordsOfDayCard() {
  const [a, b, c] = wordsOfDay()
  return (
    <section className="rounded-[22px] bg-[#16161d] p-5 border border-white/5">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber/15 text-base">🌟</span>
        <div>
          <p className="text-sm font-bold text-white">Words of the day</p>
          <p className="text-[11px] font-semibold text-[#5a5a72]">Tap to reveal • New every day</p>
        </div>
      </div>
      <div className="flex gap-2">
        <WordChip phrase={a} accent={ACCENTS[0]!} delay="0ms" />
        <WordChip phrase={b} accent={ACCENTS[1]!} delay="60ms" />
        <WordChip phrase={c} accent={ACCENTS[2]!} delay="120ms" />
      </div>
    </section>
  )
}
