/**
 * Custom phrases and voice recordings.
 * localStorage is always the source-of-truth for instant reads;
 * Supabase is synced in the background for persistence across devices.
 */

import { phrases as builtIn } from '../data/content'
import { supabase, getDeviceId } from '../lib/supabase'
import { safeGetItem, safeRemoveItem, safeSetItem } from '../lib/storageSafe'
import type { CategoryId, Phrase } from '../types'

const LS_PHRASES_KEY = 'luganda-buddy-custom-phrases-v1'

// ── local phrase helpers ──────────────────────────────────────────────────────

export function loadCustomPhrases(): Phrase[] {
  try {
    const raw = safeGetItem(LS_PHRASES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Phrase[]) : []
  } catch {
    return []
  }
}

function saveCustomPhrasesLS(phrases: Phrase[]): void {
  safeSetItem(LS_PHRASES_KEY, JSON.stringify(phrases))
}

// ── Supabase phrase helpers ───────────────────────────────────────────────────

function phraseToRow(p: Phrase) {
  return {
    id: p.id,
    device_id: getDeviceId(),
    luganda: p.luganda,
    english: p.english,
    pronunciation: p.pronunciation,
    explanation: p.explanation,
    category_id: p.categoryId,
    updated_at: new Date().toISOString(),
  }
}

function rowToPhrase(row: Record<string, unknown>): Phrase {
  return {
    id: row.id as string,
    luganda: row.luganda as string,
    english: row.english as string,
    pronunciation: (row.pronunciation as string) || '',
    explanation: (row.explanation as string) || '',
    categoryId: row.category_id as CategoryId,
    custom: true,
  }
}

/** Pull custom phrases from Supabase and merge with local. */
export async function fetchRemoteCustomPhrases(): Promise<void> {
  if (!supabase) return
  try {
    const { data, error } = await supabase
      .from('custom_phrases')
      .select('*')
      .eq('device_id', getDeviceId())
    if (error || !data) return

    const remote = (data as Record<string, unknown>[]).map(rowToPhrase)
    const local = loadCustomPhrases()
    const localIds = new Set(local.map((p) => p.id))

    // Add remote phrases not yet in local
    const merged = [...local]
    for (const rp of remote) {
      if (!localIds.has(rp.id)) merged.push(rp)
    }
    saveCustomPhrasesLS(merged)
  } catch {
    // silent
  }
}

// ── public CRUD ───────────────────────────────────────────────────────────────

export function upsertCustomPhrase(phrase: Phrase): void {
  const all = loadCustomPhrases()
  const idx = all.findIndex((p) => p.id === phrase.id)
  if (idx >= 0) {
    all[idx] = { ...phrase, custom: true }
  } else {
    all.push({ ...phrase, custom: true })
  }
  saveCustomPhrasesLS(all)

  // background sync
  if (supabase) {
    void Promise.resolve(
      supabase
        .from('custom_phrases')
        .upsert(phraseToRow({ ...phrase, custom: true }), { onConflict: 'id' }),
    ).catch(() => {})
  }
}

export function deleteCustomPhrase(id: string): void {
  saveCustomPhrasesLS(loadCustomPhrases().filter((p) => p.id !== id))
  void removeAudio(id)

  if (supabase) {
    void Promise.resolve(
      supabase.from('custom_phrases').delete().eq('id', id).eq('device_id', getDeviceId()),
    ).catch(() => {})
  }
}

/** All phrases: built-in merged with custom. Audio is loaded separately via loadAudio(). */
export function allPhrases(): Phrase[] {
  const custom = loadCustomPhrases()
  const customIds = new Set(custom.map((p) => p.id))
  const base = builtIn.filter((p) => !customIds.has(p.id))
  return [...base, ...custom]
}

// ── audio storage — IndexedDB ─────────────────────────────────────────────────
// Audio recordings are stored in IndexedDB (no size limit).
// The old localStorage audio key is intentionally left alone for migration below.

import { idbLoadAudio, idbLoadAllAudio, idbRemoveAudio, idbSaveAudio, setRemoteAudioUrl, setRemoteAudioUrls } from './audioDB'

const AUDIO_BUCKET = 'phrase-audio'

function extForBlob(blob: Blob): string {
  if (blob.type.includes('mp4')) return 'mp4'
  if (blob.type.includes('ogg')) return 'ogg'
  if (blob.type.includes('mpeg') || blob.type.includes('mp3')) return 'mp3'
  return 'webm'
}

function publicUrlFor(path: string): string {
  if (!supabase) return ''
  const { data } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path)
  // Cache-bust so updated recordings replace immediately
  return `${data.publicUrl}?t=${Date.now()}`
}

/**
 * Save locally AND upload to shared cloud storage so every visitor can hear it.
 * Throws if the cloud upload fails (admin must know).
 */
export async function saveAudio(phraseId: string, source: Blob | string): Promise<void> {
  const blob =
    source instanceof Blob
      ? source
      : await (async () => {
          const res = await fetch(source)
          return res.blob()
        })()

  await idbSaveAudio(phraseId, blob)

  if (!supabase) {
    throw new Error('Cloud sync unavailable — recording saved only on this device')
  }

  const path = `${phraseId}.${extForBlob(blob)}`

  // Remove any previous extension variants, then upload fresh
  await supabase.storage.from(AUDIO_BUCKET).remove([
    `${phraseId}.webm`,
    `${phraseId}.mp4`,
    `${phraseId}.ogg`,
    `${phraseId}.mp3`,
  ])

  const { error: upErr } = await supabase.storage.from(AUDIO_BUCKET).upload(path, blob, {
    upsert: true,
    contentType: blob.type || 'audio/webm',
    cacheControl: '3600',
  })
  if (upErr) throw new Error(`Cloud upload failed: ${upErr.message}`)

  const { error: dbErr } = await supabase.from('phrase_audio').upsert(
    { phrase_id: phraseId, storage_path: path, updated_at: new Date().toISOString() },
    { onConflict: 'phrase_id' },
  )
  if (dbErr) throw new Error(`Cloud save failed: ${dbErr.message}`)

  // Verify the public file is reachable
  const url = publicUrlFor(path)
  const probe = await fetch(url, { method: 'HEAD' }).catch(() => null)
  if (probe && !probe.ok) {
    throw new Error('Upload finished but file is not publicly readable yet — try again')
  }

  setRemoteAudioUrl(phraseId, url)
}

export async function removeAudio(phraseId: string): Promise<void> {
  await idbRemoveAudio(phraseId)
  setRemoteAudioUrl(phraseId, null)

  if (!supabase) return

  // Remove known extensions
  await supabase.storage.from(AUDIO_BUCKET).remove([
    `${phraseId}.webm`,
    `${phraseId}.mp4`,
    `${phraseId}.ogg`,
    `${phraseId}.mp3`,
  ])
  await supabase.from('phrase_audio').delete().eq('phrase_id', phraseId)
}

export async function loadAudio(phraseId: string): Promise<string | null> {
  return idbLoadAudio(phraseId)
}

/** Pull shared recordings for EVERY visitor (not filtered by device). */
export async function fetchRemoteAudio(): Promise<void> {
  if (!supabase) return
  try {
    const { data, error } = await supabase
      .from('phrase_audio')
      .select('phrase_id, storage_path')
    if (error || !data) return

    const map: Record<string, string> = {}
    for (const row of data as { phrase_id: string; storage_path: string }[]) {
      if (!row.phrase_id || !row.storage_path) continue
      const { data: pub } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(row.storage_path)
      map[row.phrase_id] = pub.publicUrl
    }
    setRemoteAudioUrls(map)
  } catch {
    // silent — app still works offline with local audio
  }
}

/**
 * Upload every local IndexedDB recording to the shared cloud.
 * Call this once from admin after deploying the shared-audio fix.
 */
export async function syncAllLocalAudioToCloud(): Promise<{ ok: number; failed: number }> {
  const all = await idbLoadAllAudio()
  let ok = 0
  let failed = 0
  for (const [phraseId, blob] of Object.entries(all)) {
    try {
      await saveAudio(phraseId, blob)
      ok++
    } catch {
      failed++
    }
  }
  return { ok, failed }
}

/** Migrate any audio previously stored in localStorage to IndexedDB. */
export async function migrateAudioFromLS(): Promise<void> {
  const LS_AUDIO_KEY = 'luganda-buddy-audio-v1'
  try {
    const raw = safeGetItem(LS_AUDIO_KEY)
    if (!raw) return

    // Old audio blobs can be huge and freeze the app on parse — skip if too large
    if (raw.length > 400_000) {
      safeRemoveItem(LS_AUDIO_KEY)
      return
    }

    const map = JSON.parse(raw) as Record<string, string>
    const existing = await idbLoadAllAudio()
    for (const [id, url] of Object.entries(map)) {
      if (!existing[id] && url) await idbSaveAudio(id, url)
    }
    safeRemoveItem(LS_AUDIO_KEY)
  } catch {
    safeRemoveItem(LS_AUDIO_KEY)
  }
}

// ── ID generation ─────────────────────────────────────────────────────────────

export function newPhraseId(categoryId: CategoryId): string {
  const existing = [
    ...builtIn.map((p) => p.id),
    ...loadCustomPhrases().map((p) => p.id),
  ]
  const prefix = `custom-${categoryId}-`
  let n = 1
  while (existing.includes(`${prefix}${n}`)) n++
  return `${prefix}${n}`
}

// ── keep for backwards compatibility ─────────────────────────────────────────
export function saveCustomPhrases(phrases: Phrase[]): void {
  saveCustomPhrasesLS(phrases)
}
