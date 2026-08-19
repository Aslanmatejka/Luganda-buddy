import { useCallback, useEffect, useState } from 'react'
import { todayISO, yesterdayISO } from '../lib/dates'
import { fetchRemoteProgress, loadProgress, saveProgress } from '../services/storage'
import type { Progress } from '../types'

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress())

  // On mount, fetch remote progress and merge into local state
  useEffect(() => {
    fetchRemoteProgress().then((remote) => {
      if (remote) setProgress(remote)
    })
  }, [])

  // Persist every change
  useEffect(() => {
    void saveProgress(progress)
  }, [progress])

  const completeLesson = useCallback((phraseIds: string[]) => {
    setProgress((current) => {
      const learned = new Set(current.learnedIds)
      for (const id of phraseIds) learned.add(id)

      const today = todayISO()
      let nextStreak = current.streak
      if (current.lastActiveDate !== today) {
        nextStreak =
          current.lastActiveDate === yesterdayISO() ? current.streak + 1 : 1
      }

      return {
        learnedIds: [...learned],
        streak: nextStreak,
        lastActiveDate: today,
        completedLessons: current.completedLessons + 1,
      }
    })
  }, [])

  return { progress, completeLesson }
}
