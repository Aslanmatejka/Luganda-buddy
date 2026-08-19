import { useCallback, useEffect, useState } from 'react'
import { hasAudioIndexed, idbLoadAudio, onAudioChange } from '../services/audioDB'

/** Load audio URL for a phrase and auto-refresh when it is saved/deleted elsewhere. */
export function useAudioUrl(phraseId: string) {
  const [url, setUrl] = useState<string | null>(null)
  const [hasAudio, setHasAudio] = useState(() => hasAudioIndexed(phraseId))

  const reload = useCallback(async () => {
    const next = await idbLoadAudio(phraseId)
    setUrl((prev) => {
      if (prev && prev !== next) URL.revokeObjectURL(prev)
      return next
    })
    setHasAudio(hasAudioIndexed(phraseId))
  }, [phraseId])

  useEffect(() => {
    void reload()
    const unsub = onAudioChange((id) => {
      if (id === phraseId) void reload()
    })
    return () => {
      unsub()
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [phraseId, reload])

  return { url, hasAudio, reload }
}
