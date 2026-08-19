import { useState } from 'react'
import { useAudioUrl } from '../hooks/useAudioUrl'
import { wordsOfDay } from '../services/lesson'
import { Panel, SectionHeading } from './ui/Panel'
import type { Phrase } from '../types'

function WordChip({ phrase }: { phrase: Phrase }) {
  const [showEnglish, setShowEnglish] = useState(false)
  const { url: audioUrl } = useAudioUrl(phrase.id)

  const speak = () => {
    if (audioUrl) new Audio(audioUrl).play().catch(() => {})
  }

  return (
    <div className="flex flex-1 flex-col rounded-xl border border-white/10 bg-[#1a1a24] p-3">
      <button
        type="button"
        onClick={() => setShowEnglish((v) => !v)}
        className="flex flex-1 flex-col items-center text-center"
      >
        {!showEnglish ? (
          <>
            <p className="text-[15px] font-semibold leading-snug text-white">{phrase.luganda}</p>
            <p className="mt-1 text-[11px] text-[#6b6b80]">{phrase.pronunciation}</p>
            <p className="mt-2 text-[10px] font-medium text-[#5a5a72]">Tap for meaning</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-white">{phrase.english}</p>
            <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-[#8b8b9e]">
              {phrase.explanation}
            </p>
          </>
        )}
      </button>
      <button
        type="button"
        onClick={speak}
        disabled={!audioUrl}
        className="mt-3 w-full rounded-lg border border-white/10 py-2 text-xs font-semibold text-[#a1a1b5] transition-colors hover:bg-white/5 disabled:opacity-40"
      >
        {audioUrl ? 'Listen' : 'No audio'}
      </button>
    </div>
  )
}

export function WordsOfDayCard() {
  const [a, b, c] = wordsOfDay()
  return (
    <Panel className="p-5">
      <SectionHeading title="Words of the day" subtitle="Three phrases to explore today" />
      <div className="flex gap-2">
        <WordChip phrase={a} />
        <WordChip phrase={b} />
        <WordChip phrase={c} />
      </div>
    </Panel>
  )
}
