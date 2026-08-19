function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null

  const byLang = (prefix: string) =>
    voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix))

  return (
    byLang('lg') ??
    byLang('sw') ??
    voices.find((voice) => /female/i.test(voice.name) && voice.lang.startsWith('en')) ??
    byLang('en') ??
    voices[0] ??
    null
  )
}

export function warmUpSpeech(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.getVoices()
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    window.speechSynthesis.getVoices()
  })
}

export function speakLuganda(text: string, onEnd?: () => void): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd?.()
    return
  }

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.72
  utterance.pitch = 1.05
  utterance.lang = 'lg-UG'
  utterance.onend = () => onEnd?.()
  utterance.onerror = () => onEnd?.()

  const voice = pickVoice()
  if (voice) {
    utterance.voice = voice
    if (!voice.lang.toLowerCase().startsWith('lg')) {
      utterance.lang = voice.lang
    }
  }

  window.speechSynthesis.speak(utterance)
}

export function stopSpeech(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}
