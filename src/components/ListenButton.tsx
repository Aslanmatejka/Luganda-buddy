import { useEffect, useRef, useState } from 'react'
import { isSpeechSupported, speakLuganda } from '../services/speech'

function SoundWave({ speaking }: { speaking: boolean }) {
  const bars = [6, 14, 10, 18, 8, 16, 6]
  return (
    <span className="flex h-6 items-end gap-[3px]" aria-hidden="true">
      {bars.map((h, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full transition-all ${speaking ? 'bar bg-white' : 'bg-white/40'}`}
          style={{
            height: speaking ? h : Math.max(3, h * 0.35),
            animationDelay: `${i * 75}ms`,
          }}
        />
      ))}
    </span>
  )
}

export function ListenButton({
  text,
  audioDataUrl,
  autoPlay = false,
  variant = 'dark',
}: {
  text: string
  audioDataUrl?: string
  autoPlay?: boolean
  variant?: 'dark' | 'light'
}) {
  const [speaking, setSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ttsOk = isSpeechSupported()
  const hasCustom = Boolean(audioDataUrl)

  const playCustom = () => {
    audioRef.current?.pause()
    const a = new Audio(audioDataUrl)
    audioRef.current = a
    setSpeaking(true)
    a.onended = () => setSpeaking(false)
    a.onerror = () => setSpeaking(false)
    a.play().catch(() => setSpeaking(false))
  }

  const play = () => {
    if (hasCustom) { playCustom(); return }
    if (!ttsOk) return
    setSpeaking(true)
    speakLuganda(text, () => setSpeaking(false))
  }

  useEffect(() => {
    if (!autoPlay) return
    const t = window.setTimeout(play, 500)
    return () => { clearTimeout(t); audioRef.current?.pause() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, audioDataUrl, autoPlay])

  const enabled = hasCustom || ttsOk

  return (
    <button
      type="button"
      onClick={play}
      disabled={!enabled}
      className={`group flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-[15px] font-bold transition active:scale-[0.97] disabled:opacity-30 ${
        speaking
          ? 'bg-violet shadow-[0_0_28px_rgba(139,92,246,0.45)]'
          : 'bg-white/8 border border-white/10 text-white hover:bg-white/12'
      }`}
    >
      <SoundWave speaking={speaking} />
      <span className={speaking ? 'text-white' : 'text-[#8b8b9e]'}>
        {hasCustom ? "Aslan's voice" : speaking ? 'Listening…' : 'Listen'}
      </span>
    </button>
  )
}
