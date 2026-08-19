import { phrases } from '../data/content'
import { dailyChallenge, todaysCategory } from '../services/lesson'
import { ChallengeCard } from '../components/ChallengeCard'
import { CategoryGrid } from '../components/CategoryGrid'
import { ProgressCard } from '../components/ProgressCard'
import { WordsOfDayCard } from '../components/WordsOfDayCard'
import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'
import { todaysMotivation } from '../lib/copy'
import type { CategoryId, Progress } from '../types'

export function HomeScreen({
  progress,
  onStart,
}: {
  progress: Progress
  onStart: (categoryId?: CategoryId) => void
}) {
  const today = todaysCategory()
  const allLearned = progress.learnedIds.length >= phrases.length

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 pb-14 pt-8">

      <header>
        <p className="label">Luganda Buddy</p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight text-white">
          Wasuze otya?
        </h1>
        <p className="mt-1.5 text-sm text-[#8b8b9e]">{todaysMotivation()}</p>
      </header>

      <Panel className="p-5">
        <p className="label">{allLearned ? 'All complete' : "Today's lesson"}</p>
        <p className="mt-2 text-xl font-semibold text-white">
          {today.emoji} {today.name}
        </p>
        <p className="mt-1 text-sm text-[#6b6b80]">5 phrases · about 2 minutes</p>
        <div className="mt-4">
          <Button onClick={() => onStart(today.id)}>Start lesson</Button>
        </div>
      </Panel>

      <ProgressCard progress={progress} />
      <WordsOfDayCard />
      <ChallengeCard phrase={dailyChallenge(progress.learnedIds)} />
      <CategoryGrid onChoose={onStart} />

      <footer className="mt-2 border-t border-white/8 pt-6 text-center">
        <p className="text-xs text-[#5a5a72]">
          Made with love by the family of the heart
        </p>
        <p className="mt-1 text-sm font-medium text-[#8b8b9e]">for Mrs. Matejka</p>
      </footer>
    </div>
  )
}
