import { categories, LESSON_SIZE } from '../data/content'
import { allPhrases } from './customPhrases'
import { dayIndex } from '../lib/dates'
import type { Category, CategoryId, Phrase } from '../types'

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const current = copy[i]
    const swap = copy[j]
    if (current === undefined || swap === undefined) continue
    copy[i] = swap
    copy[j] = current
  }
  return copy
}

export function nextCategoryId(current: CategoryId): CategoryId {
  const index = categories.findIndex((item) => item.id === current)
  const next = categories[(index + 1) % categories.length]
  return next?.id ?? 'greetings'
}

export function todaysCategory(): Category {
  const index = dayIndex() % categories.length
  return categories[index] ?? categories[0]!
}

/**
 * Three words of the day — one from each of three spread-out spots in the
 * phrase list, so you get variety across categories every day.
 * Deterministic: same three words for the whole calendar day.
 */
export function wordsOfDay(): [Phrase, Phrase, Phrase] {
  const phrases = allPhrases()
  const n = phrases.length
  const base = dayIndex() % n
  // spread evenly across the list so you rarely get three from the same category
  const a = phrases[base % n]!
  const b = phrases[(base + Math.floor(n / 3)) % n]!
  const c = phrases[(base + Math.floor((2 * n) / 3)) % n]!
  return [a, b, c]
}

export function dailyChallenge(learnedIds: string[]): Phrase {
  const phrases = allPhrases()
  const pool =
    phrases.filter((p) => learnedIds.includes(p.id)).length > 0
      ? phrases.filter((p) => learnedIds.includes(p.id))
      : phrases
  const index = dayIndex() % pool.length
  return pool[index] ?? phrases[0]!
}

export function buildLesson(
  learnedIds: string[],
  categoryId: CategoryId,
  size = LESSON_SIZE,
): Phrase[] {
  const phrases = allPhrases()
  const inCategory = phrases.filter((p) => p.categoryId === categoryId)
  const fresh = inCategory.filter((p) => !learnedIds.includes(p.id))
  const review = inCategory.filter((p) => learnedIds.includes(p.id))

  const picked: Phrase[] = []
  picked.push(...shuffle(fresh).slice(0, size))

  if (picked.length < size) {
    picked.push(...shuffle(review).slice(0, size - picked.length))
  }

  if (picked.length < size) {
    const extras = phrases.filter((p) => !picked.some((q) => q.id === p.id))
    picked.push(...shuffle(extras).slice(0, size - picked.length))
  }

  return shuffle(picked).slice(0, size)
}

export function quizChoices(phrase: Phrase): string[] {
  const phrases = allPhrases()
  const others = shuffle(
    phrases.filter((p) => p.id !== phrase.id).map((p) => p.english),
  )
  const distractors: string[] = []
  for (const meaning of others) {
    if (distractors.length >= 2) break
    if (meaning !== phrase.english && !distractors.includes(meaning)) {
      distractors.push(meaning)
    }
  }
  return shuffle([phrase.english, ...distractors])
}
