import { useCallback, useEffect, useState } from 'react'
import { hashFromScreen, readScreenFromLocation, screenFromHash, writeScreenToLocation } from '../lib/routing'
import type { Screen } from '../types'

export function useScreen() {
  const [screen, setScreenState] = useState<Screen>(() => readScreenFromLocation())

  const navigate = useCallback((next: Screen, replace = false) => {
    setScreenState(next)
    writeScreenToLocation(next, replace)
  }, [])

  // Browser back / forward
  useEffect(() => {
    const onHashChange = () => setScreenState(screenFromHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // On first load, normalise the hash in the address bar
  useEffect(() => {
    writeScreenToLocation(screen, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { screen, navigate }
}

export { hashFromScreen, screenFromHash }
