/**
 * Progress storage — writes to Supabase first, mirrors to localStorage so the
 * app works offline and starts instantly (localStorage is read synchronously
 * while the remote load happens in the background).
 */

import { supabase, getDeviceId } from '../lib/supabase'
import { safeGetItem, safeSetItem } from '../lib/storageSafe'
import type { Progress } from '../types'

const LS_KEY = 'luganda-buddy-progress-v1'

// ── local helpers ─────────────────────────────────────────────────────────────

const empty = (): Progress => ({
  learnedIds: [],
  streak: 0,
  lastActiveDate: null,
  completedLessons: 0,
})

function fromLS(): Progress {
  try {
    const raw = safeGetItem(LS_KEY)
    if (!raw) return empty()
    const p = JSON.parse(raw) as Partial<Progress>
    return {
      learnedIds: Array.isArray(p.learnedIds) ? p.learnedIds : [],
      streak: typeof p.streak === 'number' ? p.streak : 0,
      lastActiveDate: typeof p.lastActiveDate === 'string' ? p.lastActiveDate : null,
      completedLessons: typeof p.completedLessons === 'number' ? p.completedLessons : 0,
    }
  } catch {
    return empty()
  }
}

function toLS(p: Progress): void {
  safeSetItem(LS_KEY, JSON.stringify(p))
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

function toRow(p: Progress) {
  return {
    device_id: getDeviceId(),
    learned_ids: p.learnedIds,
    streak: p.streak,
    last_active_date: p.lastActiveDate,
    completed_lessons: p.completedLessons,
    updated_at: new Date().toISOString(),
  }
}

function fromRow(row: Record<string, unknown>): Progress {
  return {
    learnedIds: Array.isArray(row.learned_ids) ? (row.learned_ids as string[]) : [],
    streak: typeof row.streak === 'number' ? row.streak : 0,
    lastActiveDate: typeof row.last_active_date === 'string' ? row.last_active_date : null,
    completedLessons: typeof row.completed_lessons === 'number' ? row.completed_lessons : 0,
  }
}

// ── public API ────────────────────────────────────────────────────────────────

/** Returns localStorage progress immediately (fast), then syncs from remote. */
export function loadProgress(): Progress {
  return fromLS()
}

/** Fetch progress from Supabase — call this on mount and merge with local. */
export async function fetchRemoteProgress(): Promise<Progress | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('learner_progress')
      .select('*')
      .eq('device_id', getDeviceId())
      .maybeSingle()
    if (error || !data) return null
    const remote = fromRow(data as Record<string, unknown>)
    // Merge: union learned IDs, take whichever streak is higher
    const local = fromLS()
    const merged: Progress = {
      learnedIds: [...new Set([...local.learnedIds, ...remote.learnedIds])],
      streak: Math.max(local.streak, remote.streak),
      lastActiveDate: local.lastActiveDate ?? remote.lastActiveDate,
      completedLessons: Math.max(local.completedLessons, remote.completedLessons),
    }
    toLS(merged)
    return merged
  } catch {
    return null
  }
}

/** Save progress to both localStorage and Supabase. */
export async function saveProgress(progress: Progress): Promise<void> {
  toLS(progress)
  if (!supabase) return
  try {
    await supabase
      .from('learner_progress')
      .upsert(toRow(progress), { onConflict: 'device_id' })
  } catch {
    // silent — local copy is already saved
  }
}
