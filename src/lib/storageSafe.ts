/**
 * Safe localStorage helpers — never throw, even when quota is full.
 */

let memoryDeviceId: string | null = null

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function safeDeviceId(storageKey: string): string {
  const existing = safeGetItem(storageKey)
  if (existing) return existing

  const id = memoryDeviceId ?? crypto.randomUUID()
  if (!safeSetItem(storageKey, id)) {
    memoryDeviceId = id
  }
  return id
}
