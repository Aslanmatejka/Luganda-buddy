/**
 * IndexedDB-backed audio store.
 * localStorage has a ~5 MB limit which audio recordings easily exceed.
 * IndexedDB supports hundreds of MB and is the correct API for binary data.
 */

const DB_NAME    = 'luganda-buddy'
const STORE_NAME = 'audio'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

export async function idbSaveAudio(phraseId: string, dataUrl: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req   = store.put(dataUrl, phraseId)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}

export async function idbLoadAudio(phraseId: string): Promise<string | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req   = store.get(phraseId)
    req.onsuccess = () => resolve((req.result as string) ?? null)
    req.onerror   = () => reject(req.error)
  })
}

export async function idbRemoveAudio(phraseId: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req   = store.delete(phraseId)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}

export async function idbLoadAllAudio(): Promise<Record<string, string>> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const result: Record<string, string> = {}
    const cursor = store.openCursor()
    cursor.onsuccess = () => {
      const c = cursor.result
      if (c) {
        result[c.key as string] = c.value as string
        c.continue()
      } else {
        resolve(result)
      }
    }
    cursor.onerror = () => reject(cursor.error)
  })
}
