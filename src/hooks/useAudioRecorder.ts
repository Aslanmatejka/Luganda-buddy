import { useCallback, useRef, useState } from 'react'

export type RecorderState = 'idle' | 'recording' | 'done' | 'error'

export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>('idle')
  const [blob, setBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const start = useCallback(async () => {
    setBlob(null)
    setPreviewUrl(null)
    setErrorMsg(null)
    chunksRef.current = []
    cleanupStream()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream

      const mimeType =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', ''].find(
          (m) => m === '' || MediaRecorder.isTypeSupported(m),
        ) ?? ''

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType, audioBitsPerSecond: 128_000 } : undefined,
      )
      mediaRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        cleanupStream()
        const type = recorder.mimeType || mimeType || 'audio/webm'
        const result = new Blob(chunksRef.current, { type })

        if (result.size < 500) {
          setErrorMsg('Recording too short or empty — hold the button and speak clearly.')
          setState('error')
          return
        }

        const url = URL.createObjectURL(result)
        setBlob(result)
        setPreviewUrl(url)
        setState('done')
      }

      recorder.onerror = () => {
        cleanupStream()
        setErrorMsg('Recording failed — check microphone permissions.')
        setState('error')
      }

      // timeslice ensures chunks arrive even on iOS Safari
      recorder.start(250)
      setState('recording')
    } catch {
      setErrorMsg('Microphone access denied — allow mic in browser settings.')
      setState('error')
    }
  }, [])

  const stop = useCallback(() => {
    if (mediaRef.current?.state === 'recording') {
      mediaRef.current.stop()
    }
  }, [])

  const reset = useCallback(() => {
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop()
    cleanupStream()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setBlob(null)
    setPreviewUrl(null)
    setErrorMsg(null)
    setState('idle')
  }, [previewUrl])

  return { state, blob, previewUrl, errorMsg, start, stop, reset }
}
