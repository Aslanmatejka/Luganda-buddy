/**
 * IndexedDB audio store — stores raw Blob objects (not base64 strings).
 * Waits for transaction.oncomplete before resolving (critical for durability).
 */

const DB_NAME = 'luganda-buddy'
const STORE_NAME = 'audio'
const DB_VERSION = 2
const INDEX_KEY = 'luganda-buddy-audio-index'

export type StoredAudio = Blob | string // string = legacy base64 data URL

let dbPromise: Promise<IDBDatabase> | null = null

function resetDB(): void {
  dbPromise = null
}

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = (e) => {
        const db = req.result
        // v1 → v2: recreate store cleanly
        if (e.oldVersion < 1) {
          db.createObjectStore(STORE_NAME)
        } else if (e.oldVersion < 2) {
          if (db.objectStoreNames.contains(STORE_NAME)) {
            db.deleteObjectStore(STORE_NAME)
          }
          db.createObjectStore(STORE_NAME)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => {
        resetDB()
        reject(req.error ?? new Error('IndexedDB open failed'))
      }
      req.onblocked = () => {
        resetDB()
        reject(new Error('IndexedDB blocked — close other tabs and retry'))
      }
    })
  }
  return dbPromise
}

function runTx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return getDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const store = tx.objectStore(STORE_NAME)
        const req = fn(store)
        req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
        tx.oncomplete = () => resolve(req.result as T)
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
        tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'))
      }),
  )
}

// ── lightweight sync index in localStorage ────────────────────────────────────
// Lets the UI show "has voice" instantly without waiting for IndexedDB.

function readIndex(): Set<string> {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function writeIndex(ids: Set<string>): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify([...ids]))
  } catch {
    // non-fatal
  }
}

function indexAdd(id: string): void {
  const s = readIndex()
  s.add(id)
  writeIndex(s)
}

function indexRemove(id: string): void {
  const s = readIndex()
  s.delete(id)
  writeIndex(s)
}

export function hasAudioIndexed(phraseId: string): boolean {
  return readIndex().has(phraseId) || Boolean(remoteUrls[phraseId])
}

// ── change notifications ──────────────────────────────────────────────────────

type AudioListener = (phraseId: string) => void
const listeners = new Set<AudioListener>()

export function onAudioChange(fn: AudioListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notifyAudioChange(phraseId: string): void {
  listeners.forEach((fn) => fn(phraseId))
}

// ── shared cloud URLs (loaded for every visitor) ──────────────────────────────

const remoteUrls: Record<string, string> = {}

export function setRemoteAudioUrl(phraseId: string, url: string | null): void {
  if (url) remoteUrls[phraseId] = url
  else delete remoteUrls[phraseId]
  if (url) indexAdd(phraseId)
  notifyAudioChange(phraseId)
}

export function setRemoteAudioUrls(map: Record<string, string>): void {
  for (const [id, url] of Object.entries(map)) {
    remoteUrls[id] = url
    indexAdd(id)
  }
  listeners.forEach((fn) => fn('*'))
}

export function getRemoteAudioUrl(phraseId: string): string | null {
  return remoteUrls[phraseId] ?? null
}

// ── convert legacy string → Blob ─────────────────────────────────────────────

function toBlob(value: StoredAudio): Blob {
  if (value instanceof Blob) return value
  // legacy base64 data URL string
  const [header, data] = value.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'audio/webm'
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/** Local IndexedDB blob → object URL (or null) */
async function idbLoadLocal(phraseId: string): Promise<string | null> {
  try {
    const raw = await runTx<StoredAudio | undefined>('readonly', (s) => s.get(phraseId))
    if (!raw) return null
    const blob = toBlob(raw)
    if (blob.size === 0) return null
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

/**
 * Playable URL for a phrase.
 * Prefers local IndexedDB, then falls back to the shared cloud URL.
 */
export async function idbLoadAudio(phraseId: string): Promise<string | null> {
  const local = await idbLoadLocal(phraseId)
  if (local) return local
  return getRemoteAudioUrl(phraseId)
}

/** Accepts a Blob or a base64 data URL string */
export async function idbSaveAudio(phraseId: string, source: Blob | string): Promise<void> {
  const blob = source instanceof Blob ? source : toBlob(source)
  if (blob.size === 0) throw new Error('Recording is empty — try recording again')

  await runTx<IDBValidKey>('readwrite', (s) => s.put(blob, phraseId))

  // Verify write landed
  const check = await runTx<StoredAudio | undefined>('readonly', (s) => s.get(phraseId))
  if (!check) throw new Error('Save verification failed — storage may be blocked')

  indexAdd(phraseId)
  notifyAudioChange(phraseId)
}

export async function idbRemoveAudio(phraseId: string): Promise<void> {
  await runTx<undefined>('readwrite', (s) => s.delete(phraseId))
  indexRemove(phraseId)
  notifyAudioChange(phraseId)
}

export async function idbLoadAllAudio(): Promise<Record<string, Blob>> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const result: Record<string, Blob> = {}
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const cursor = store.openCursor()
    cursor.onerror = () => reject(cursor.error)
    cursor.onsuccess = () => {
      const c = cursor.result
      if (c) {
        result[c.key as string] = toBlob(c.value as StoredAudio)
        c.continue()
      }
    }
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error)
  })
}
