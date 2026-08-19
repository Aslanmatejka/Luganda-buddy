export type CategoryId =
  | 'greetings'
  | 'family'
  | 'food'
  | 'everyday'
  | 'fun'

export type Phrase = {
  id: string
  luganda: string
  english: string
  pronunciation: string
  categoryId: CategoryId
  explanation: string
  /** base64 data-url of a recorded audio clip, stored in localStorage */
  audioDataUrl?: string
  /** true when this phrase was added by Aslan in the admin panel */
  custom?: boolean
}

export type Category = {
  id: CategoryId
  emoji: string
  name: string
  blurb: string
  tint: string
}

export type Progress = {
  learnedIds: string[]
  streak: number
  lastActiveDate: string | null
  completedLessons: number
}

export type Screen =
  | { name: 'home' }
  | { name: 'lesson'; categoryId?: CategoryId }
  | {
      name: 'complete'
      practiced: number
      newlyLearned: number
      categoryId: CategoryId
      categoryName: string
    }
  | { name: 'admin' }
