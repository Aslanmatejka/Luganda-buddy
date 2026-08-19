import { motivationalLines } from '../data/content'
import { todayISO } from './dates'
import type { Progress } from '../types'

export function streakLabel(progress: Progress): string {
  if (progress.streak <= 0) {
    return 'Whenever you are ready. No rush.'
  }
  if (progress.lastActiveDate && progress.lastActiveDate !== todayISO()) {
    return 'Welcome back. Fresh start, no guilt.'
  }
  if (progress.streak === 1) {
    return 'A calm start. One easy day.'
  }
  if (progress.streak < 7) {
    return `${progress.streak} easy days in a row. Nice and gentle.`
  }
  return `${progress.streak} cozy days. You are just showing up.`
}

export function todaysMotivation(): string {
  const index = new Date().getDate() % motivationalLines.length
  return motivationalLines[index] ?? motivationalLines[0]!
}
