import { useEffect, useRef, useState } from 'react'
import { useAudioUrl } from '../hooks/useAudioUrl'

export function ListenButton({
  phraseId,
  autoPlay = false,
}: {
  phraseId: string
  autoPlay?: boolean
}) {
  const [speaking, setSpeaking] = useState(false)
  const { url: audio } = useAudioUrl(phraseId)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const play = () => {
    if (!audio) return
    audioRef.current?.pause()
    const a = new Audio(audio)
    audioRef.current = a
    setSpeaking(true)
    a.onended = () => setSpeaking(false)
    a.onerror = () => setSpeaking(false)
    a.play().catch(() => setSpeaking(false))
  }

  useEffect(() => {
    if (!autoPlay || !audio) return
    const t = window.setTimeout(play, 500)
    return () => { clearTimeout(t); audioRef.current?.pause() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio, autoPlay])

  if (!audio) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-xl border border-dashed border-white/12 px-5 py-4 text-sm text-[#5a5a72]"
        role="status"
      >
        No recording yet
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={play}
      className={`flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-4 text-[15px] font-semibold transition-colors active:scale-[0.98] ${
        speaking
          ? 'border-violet/40 bg-violet/15 text-violet'
          : 'border-white/20 bg-white/5 text-white hover:bg-white/8'
      }`}
    >
      <span className="text-base" aria-hidden="true">{speaking ? '◼' : '▶'}</span>
      {speaking ? 'Playing…' : 'Listen'}
    </button>
  )
}
