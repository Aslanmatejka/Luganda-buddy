import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AdminClaimModal } from './components/AdminClaimModal'
import { useProgress } from './hooks/useProgress'
import { useAdminAccess } from './hooks/useAdminAccess'
import { useScreen } from './hooks/useScreen'
import { AdminScreen } from './screens/AdminScreen'
import { CompleteScreen } from './screens/CompleteScreen'
import { HomeScreen } from './screens/HomeScreen'
import { LessonScreen } from './screens/LessonScreen'
import { getCategory } from './data/content'
import { fetchRemoteAudio, fetchRemoteCustomPhrases, migrateAudioFromLS } from './services/customPhrases'
import { nextCategoryId } from './services/lesson'
import { warmUpSpeech } from './services/speech'
import type { CategoryId, Phrase } from './types'

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-[#0e0e12]">
      <div className="relative pb-[env(safe-area-inset-bottom)]">{children}</div>
    </div>
  )
}

function AdminEntryZone({ onActivate }: { onActivate: () => void }) {
  const tapsRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTap = () => {
    tapsRef.current += 1
    if (timerRef.current) clearTimeout(timerRef.current)
    if (tapsRef.current >= 5) {
      tapsRef.current = 0
      onActivate()
      return
    }
    timerRef.current = setTimeout(() => { tapsRef.current = 0 }, 1500)
  }

  return (
    <div
      className="fixed bottom-0 right-0 z-40 h-16 w-16 cursor-default"
      onClick={handleTap}
      aria-hidden="true"
    />
  )
}

export default function App() {
  const { progress, completeLesson } = useProgress()
  const { isAdmin, isChecking, signIn } = useAdminAccess()
  const { screen, navigate } = useScreen()
  const [showClaim, setShowClaim] = useState(false)
  const [contentKey, setContentKey] = useState(0)

  useEffect(() => {
    const run = async () => {
      warmUpSpeech()
      await Promise.all([
        fetchRemoteCustomPhrases(),
        fetchRemoteAudio(),
        migrateAudioFromLS(),
      ])
      // Remount screens so newly synced words/voices appear without refresh
      setContentKey((k) => k + 1)
    }
    const t = window.setTimeout(() => { void run() }, 100)
    return () => window.clearTimeout(t)
  }, [])

  // If URL is #/admin but user isn't admin, send them home
  useEffect(() => {
    if (screen.name === 'admin' && !isChecking && !isAdmin) {
      navigate({ name: 'home' }, true)
    }
  }, [screen.name, isChecking, isAdmin, navigate])

  const startLesson = (categoryId?: CategoryId) => {
    navigate({ name: 'lesson', categoryId })
  }

  const finishLesson = (lessonPhrases: Phrase[], categoryId: CategoryId) => {
    const before = new Set(progress.learnedIds)
    const newlyLearned = lessonPhrases.filter((p) => !before.has(p.id)).length
    completeLesson(lessonPhrases.map((p) => p.id))
    navigate({
      name: 'complete',
      practiced: lessonPhrases.length,
      newlyLearned,
      categoryId,
      categoryName: getCategory(categoryId).name,
    })
  }

  if (screen.name === 'admin') {
    if (isChecking) {
      return (
        <Shell>
          <div className="flex min-h-dvh items-center justify-center text-sm font-semibold text-[#8b8b9e]">
            Loading admin…
          </div>
        </Shell>
      )
    }
    if (!isAdmin) return null

    return (
      <Shell>
        <AdminScreen key={`admin-${contentKey}`} onClose={() => navigate({ name: 'home' })} />
      </Shell>
    )
  }

  if (screen.name === 'lesson') {
    const categoryId = screen.categoryId ?? 'greetings'
    return (
      <Shell>
        <LessonScreen
          key={`lesson-${contentKey}-${categoryId}`}
          categoryId={categoryId}
          learnedIds={progress.learnedIds}
          onExit={() => navigate({ name: 'home' })}
          onFinish={(lessonPhrases) => finishLesson(lessonPhrases, categoryId)}
        />
      </Shell>
    )
  }

  if (screen.name === 'complete') {
    return (
      <Shell>
        <CompleteScreen
          practiced={screen.practiced}
          newlyLearned={screen.newlyLearned}
          categoryName={screen.categoryName}
          onHome={() => navigate({ name: 'home' })}
          onAgain={() =>
            navigate({ name: 'lesson', categoryId: nextCategoryId(screen.categoryId) })
          }
        />
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="relative">
        <HomeScreen key={`home-${contentKey}`} progress={progress} onStart={startLesson} />

        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate({ name: 'admin' })}
            title="Admin"
            className="fixed bottom-6 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-[#16161d] text-[#a1a1b5] shadow-lg transition-colors hover:bg-[#1e1e28] hover:text-white"
          >
            ⚙
          </button>
        )}

        {!isAdmin && !isChecking && (
          <AdminEntryZone onActivate={() => setShowClaim(true)} />
        )}

        {showClaim && !isAdmin && (
          <AdminClaimModal
            onSignIn={signIn}
            onDismiss={() => setShowClaim(false)}
          />
        )}
      </div>
    </Shell>
  )
}
