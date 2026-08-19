import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AdminClaimModal } from './components/AdminClaimModal'
import { useProgress } from './hooks/useProgress'
import { useAdminAccess } from './hooks/useAdminAccess'
import { AdminScreen } from './screens/AdminScreen'
import { CompleteScreen } from './screens/CompleteScreen'
import { HomeScreen } from './screens/HomeScreen'
import { LessonScreen } from './screens/LessonScreen'
import { getCategory } from './data/content'
import { fetchRemoteAudio, fetchRemoteCustomPhrases } from './services/customPhrases'
import { nextCategoryId } from './services/lesson'
import { warmUpSpeech } from './services/speech'
import type { CategoryId, Phrase, Screen } from './types'

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#0e0e12]">
      <div className="pointer-events-none absolute -top-32 -right-20 h-72 w-72 rounded-full bg-violet/10 blur-3xl" />
      <div className="pointer-events-none absolute top-64 -left-24 h-60 w-60 rounded-full bg-coral/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-72 w-72 rounded-full bg-emerald/6 blur-3xl" />
      <div className="relative pb-[env(safe-area-inset-bottom)]">{children}</div>
    </div>
  )
}

/**
 * Invisible tap zone (bottom-right corner).
 * Tap 5 times quickly to open the claim modal.
 */
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
    // Reset tap count if no more taps within 1.5 s
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
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [showClaim, setShowClaim] = useState(false)

  useEffect(() => {
    warmUpSpeech()
    void fetchRemoteCustomPhrases()
    void fetchRemoteAudio()
  }, [])

  const startLesson = (categoryId?: CategoryId) => {
    setScreen({ name: 'lesson', categoryId })
  }

  const finishLesson = (lessonPhrases: Phrase[], categoryId: CategoryId) => {
    const before = new Set(progress.learnedIds)
    const newlyLearned = lessonPhrases.filter((p) => !before.has(p.id)).length
    completeLesson(lessonPhrases.map((p) => p.id))
    setScreen({
      name: 'complete',
      practiced: lessonPhrases.length,
      newlyLearned,
      categoryId,
      categoryName: getCategory(categoryId).name,
    })
  }

  if (screen.name === 'admin') {
    return (
      <Shell>
        <AdminScreen onClose={() => setScreen({ name: 'home' })} />
      </Shell>
    )
  }

  if (screen.name === 'lesson') {
    const categoryId = screen.categoryId ?? 'greetings'
    return (
      <Shell>
        <LessonScreen
          categoryId={categoryId}
          learnedIds={progress.learnedIds}
          onExit={() => setScreen({ name: 'home' })}
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
          onHome={() => setScreen({ name: 'home' })}
          onAgain={() =>
            setScreen({ name: 'lesson', categoryId: nextCategoryId(screen.categoryId) })
          }
        />
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="relative">
        <HomeScreen progress={progress} onStart={startLesson} />

        {/* Visible admin button — only shown when access is confirmed */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setScreen({ name: 'admin' })}
            title="Admin — edit phrases & recordings"
            className="fixed bottom-6 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-ink/80 text-lg text-cream shadow-lg backdrop-blur-sm transition active:scale-95"
          >
            ⚙️
          </button>
        )}

        {/* Hidden long-press zone for first-time claim (only visible while not yet admin & not checking) */}
        {!isAdmin && !isChecking && (
          <AdminEntryZone onActivate={() => setShowClaim(true)} />
        )}

        {/* Claim modal */}
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
