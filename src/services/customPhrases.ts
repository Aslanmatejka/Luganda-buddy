/**
 * Custom phrases and voice recordings.
 * localStorage for instant reads; Supabase is the shared source of truth.
 */

import { phrases as builtIn } from '../data/content'
import { supabase, getDeviceId } from '../lib/supabase'
import { safeGetItem, safeRemoveItem, safeSetItem } from '../lib/storageSafe'
import {
  idbLoadAudio,
  idbLoadAllAudio,
  idbRemoveAudio,
  idbSaveAudio,
  setRemoteAudioUrl,
  setRemoteAudioUrls,
} from './audioDB'
import type { CategoryId, Phrase } from '../types'

const LS_PHRASES_KEY = 'luganda-buddy-custom-phrases-v1'
const AUDIO_BUCKET = 'phrase-audio'

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
    luganda: p.luganda.trim(),
    english: p.english.trim(),
    pronunciation: (p.pronunciation || '').trim(),
    explanation: (p.explanation || '').trim(),
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

/** Pull ALL shared custom phrases (not filtered by device) and merge locally. */
export async function fetchRemoteCustomPhrases(): Promise<void> {
  if (!supabase) return
  try {
    const { data, error } = await supabase
      .from('custom_phrases')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error || !data) return

    const remote = (data as Record<string, unknown>[]).map(rowToPhrase)
    const local = loadCustomPhrases()
    const byId = new Map<string, Phrase>()

    // Local first, then remote overwrites (shared DB is source of truth)
    for (const p of local) byId.set(p.id, p)
    for (const p of remote) byId.set(p.id, p)

    saveCustomPhrasesLS([...byId.values()])
  } catch {
    // silent — offline still works with local phrases
  }
}

/**
 * Save phrase locally AND to the shared database.
 * Throws unless the database row is confirmed.
 */
export async function upsertCustomPhrase(phrase: Phrase): Promise<void> {
  const saved: Phrase = {
    ...phrase,
    luganda: phrase.luganda.trim(),
    english: phrase.english.trim(),
    custom: true,
  }
  if (!saved.luganda || !saved.english) {
    throw new Error('Luganda and English are required')
  }

  const all = loadCustomPhrases()
  const idx = all.findIndex((p) => p.id === saved.id)
  if (idx >= 0) all[idx] = saved
  else all.push(saved)
  saveCustomPhrasesLS(all)

  if (!supabase) {
    throw new Error('Cloud sync unavailable — phrase saved only on this device')
  }

  const { error } = await supabase
    .from('custom_phrases')
    .upsert(phraseToRow(saved), { onConflict: 'id' })
  if (error) throw new Error(`Database save failed: ${error.message}`)

  const { data: verified, error: verifyErr } = await supabase
    .from('custom_phrases')
    .select('id, luganda, english')
    .eq('id', saved.id)
    .maybeSingle()

  if (verifyErr || !verified?.id) {
    throw new Error('Saved locally but database verification failed — try again')
  }
}

export async function deleteCustomPhrase(id: string): Promise<void> {
  saveCustomPhrasesLS(loadCustomPhrases().filter((p) => p.id !== id))
  void removeAudio(id)

  if (!supabase) return
  const { error } = await supabase.from('custom_phrases').delete().eq('id', id)
  if (error) throw new Error(`Database delete failed: ${error.message}`)
}

/** How many custom/edited phrases are in the shared database. */
export async function countCloudPhrases(): Promise<number> {
  if (!supabase) return 0
  const { count, error } = await supabase
    .from('custom_phrases')
    .select('id', { count: 'exact', head: true })
  if (error) return 0
  return count ?? 0
}

/** Upload every local custom phrase to the shared database. */
export async function syncAllLocalPhrasesToCloud(): Promise<{ ok: number; failed: number }> {
  const all = loadCustomPhrases()
  let ok = 0
  let failed = 0
  for (const phrase of all) {
    try {
      await upsertCustomPhrase(phrase)
      ok++
    } catch {
      failed++
    }
  }
  return { ok, failed }
}

/** All phrases: built-in merged with custom. Audio is loaded separately via loadAudio(). */
export function allPhrases(): Phrase[] {
  const custom = loadCustomPhrases()
  const customIds = new Set(custom.map((p) => p.id))
  const base = builtIn.filter((p) => !customIds.has(p.id))
  return [...base, ...custom]
}

export function saveCustomPhrases(phrases: Phrase[]): void {
  saveCustomPhrasesLS(phrases)
}

// ── audio storage ─────────────────────────────────────────────────────────────

function extForBlob(blob: Blob): string {
  if (blob.type.includes('mp4')) return 'mp4'
  if (blob.type.includes('ogg')) return 'ogg'
  if (blob.type.includes('mpeg') || blob.type.includes('mp3')) return 'mp3'
  return 'webm'
}

function publicUrlFor(path: string): string {
  if (!supabase) return ''
  const { data } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}

function cleanPublicUrl(path: string): string {
  if (!supabase) return ''
  return supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path).data.publicUrl
}

/**
 * Save locally AND upload to shared cloud storage + database row.
 * Throws unless the database row is confirmed.
 */
export async function saveAudio(phraseId: string, source: Blob | string): Promise<void> {
  const blob =
    source instanceof Blob
      ? source
      : await (async () => {
          const res = await fetch(source)
          return res.blob()
        })()

  if (blob.size < 200) {
    throw new Error('Recording is empty or too short — please record again')
  }

  await idbSaveAudio(phraseId, blob)

  if (!supabase) {
    throw new Error('Cloud sync unavailable — recording saved only on this device')
  }

  const path = `${phraseId}.${extForBlob(blob)}`
  const mime = blob.type || 'audio/webm'
  const publicUrl = cleanPublicUrl(path)

  await supabase.storage.from(AUDIO_BUCKET).remove([
    `${phraseId}.webm`,
    `${phraseId}.mp4`,
    `${phraseId}.ogg`,
    `${phraseId}.mp3`,
  ])

  const { error: upErr } = await supabase.storage.from(AUDIO_BUCKET).upload(path, blob, {
    upsert: true,
    contentType: mime,
    cacheControl: '3600',
  })
  if (upErr) throw new Error(`Cloud upload failed: ${upErr.message}`)

  const row = {
    phrase_id: phraseId,
    storage_path: path,
    public_url: publicUrl,
    byte_size: blob.size,
    mime_type: mime,
    updated_at: new Date().toISOString(),
  }
  const { error: dbErr } = await supabase
    .from('phrase_audio')
    .upsert(row, { onConflict: 'phrase_id' })
  if (dbErr) throw new Error(`Database save failed: ${dbErr.message}`)

  const { data: verified, error: verifyErr } = await supabase
    .from('phrase_audio')
    .select('phrase_id, storage_path, public_url')
    .eq('phrase_id', phraseId)
    .maybeSingle()

  if (verifyErr || !verified?.storage_path) {
    throw new Error('Saved locally but database verification failed — try Save again')
  }

  setRemoteAudioUrl(phraseId, publicUrlFor(path))
}

export async function removeAudio(phraseId: string): Promise<void> {
  await idbRemoveAudio(phraseId)
  setRemoteAudioUrl(phraseId, null)

  if (!supabase) return

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

export async function countCloudAudio(): Promise<number> {
  if (!supabase) return 0
  const { count, error } = await supabase
    .from('phrase_audio')
    .select('phrase_id', { count: 'exact', head: true })
  if (error) return 0
  return count ?? 0
}

export async function fetchRemoteAudio(): Promise<void> {
  if (!supabase) return
  try {
    const { data, error } = await supabase
      .from('phrase_audio')
      .select('phrase_id, storage_path, public_url')
    if (error || !data) return

    const map: Record<string, string> = {}
    for (const row of data as {
      phrase_id: string
      storage_path: string
      public_url: string | null
    }[]) {
      if (!row.phrase_id) continue
      if (row.public_url) map[row.phrase_id] = row.public_url
      else if (row.storage_path) map[row.phrase_id] = cleanPublicUrl(row.storage_path)
    }
    setRemoteAudioUrls(map)
  } catch {
    // silent
  }
}

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

export async function migrateAudioFromLS(): Promise<void> {
  const LS_AUDIO_KEY = 'luganda-buddy-audio-v1'
  try {
    const raw = safeGetItem(LS_AUDIO_KEY)
    if (!raw) return
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
