import { useCallback, useRef, useState } from 'react'

export type RecorderState = 'idle' | 'recording' | 'done'

export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>('idle')
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const start = useCallback(async () => {
    setDataUrl(null)
    chunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Prefer a widely-supported codec
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', '']
        .find((m) => m === '' || MediaRecorder.isTypeSupported(m)) ?? ''
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRef.current = recorder
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        const reader = new FileReader()
        reader.onloadend = () => {
          setDataUrl(reader.result as string)
          setState('done')
        }
        reader.readAsDataURL(blob)
      }
      recorder.start()
      setState('recording')
    } catch {
      setState('idle')
    }
  }, [])

  const stop = useCallback(() => {
    mediaRef.current?.stop()
  }, [])

  const reset = useCallback(() => {
    mediaRef.current?.stop()
    setDataUrl(null)
    setState('idle')
  }, [])

  return { state, dataUrl, start, stop, reset }
}
