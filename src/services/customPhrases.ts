/**
 * Custom phrases and voice recordings.
 * localStorage is always the source-of-truth for instant reads;
 * Supabase is synced in the background for persistence across devices.
 */

import { phrases as builtIn } from '../data/content'
import { supabase, getDeviceId } from '../lib/supabase'
import type { CategoryId, Phrase } from '../types'

const LS_PHRASES_KEY = 'luganda-buddy-custom-phrases-v1'

// ── local phrase helpers ──────────────────────────────────────────────────────

export function loadCustomPhrases(): Phrase[] {
  try {
    const raw = localStorage.getItem(LS_PHRASES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Phrase[]) : []
  } catch {
    return []
  }
}

function saveCustomPhrasesLS(phrases: Phrase[]): void {
  localStorage.setItem(LS_PHRASES_KEY, JSON.stringify(phrases))
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
  removeAudio(id)

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

import { idbLoadAudio, idbLoadAllAudio, idbRemoveAudio, idbSaveAudio } from './audioDB'

export async function saveAudio(phraseId: string, dataUrl: string): Promise<void> {
  await idbSaveAudio(phraseId, dataUrl)

  if (supabase) {
    void Promise.resolve(
      supabase.from('audio_recordings').upsert(
        { phrase_id: phraseId, device_id: getDeviceId(), data_url: dataUrl, updated_at: new Date().toISOString() },
        { onConflict: 'phrase_id,device_id' },
      ),
    ).catch(() => {})
  }
}

export async function removeAudio(phraseId: string): Promise<void> {
  await idbRemoveAudio(phraseId)

  if (supabase) {
    void Promise.resolve(
      supabase
        .from('audio_recordings')
        .delete()
        .eq('phrase_id', phraseId)
        .eq('device_id', getDeviceId()),
    ).catch(() => {})
  }
}

export async function loadAudio(phraseId: string): Promise<string | null> {
  return idbLoadAudio(phraseId)
}

/** Pull audio recordings from Supabase and store in IndexedDB. */
export async function fetchRemoteAudio(): Promise<void> {
  if (!supabase) return
  try {
    const { data, error } = await supabase
      .from('audio_recordings')
      .select('phrase_id, data_url')
      .eq('device_id', getDeviceId())
    if (error || !data) return

    const existing = await idbLoadAllAudio()
    for (const row of data as { phrase_id: string; data_url: string }[]) {
      if (!existing[row.phrase_id] && row.data_url) {
        await idbSaveAudio(row.phrase_id, row.data_url)
      }
    }
  } catch {
    // silent
  }
}

/** Migrate any audio previously stored in localStorage to IndexedDB. */
export async function migrateAudioFromLS(): Promise<void> {
  const LS_AUDIO_KEY = 'luganda-buddy-audio-v1'
  try {
    const raw = localStorage.getItem(LS_AUDIO_KEY)
    if (!raw) return
    const map = JSON.parse(raw) as Record<string, string>
    const existing = await idbLoadAllAudio()
    for (const [id, url] of Object.entries(map)) {
      if (!existing[id] && url) await idbSaveAudio(id, url)
    }
    localStorage.removeItem(LS_AUDIO_KEY)
  } catch {
    // silent
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
