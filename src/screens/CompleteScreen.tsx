import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'

export function CompleteScreen({
  practiced,
  newlyLearned,
  categoryName,
  onHome,
  onAgain,
}: {
  practiced: number
  newlyLearned: number
  categoryName: string
  onHome: () => void
  onAgain: () => void
}) {
  const headline =
    newlyLearned > 0
      ? `${newlyLearned} new ${newlyLearned === 1 ? 'phrase' : 'phrases'} learned`
      : `${practiced} phrases practiced`

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-14 pt-16 text-center">
      <p className="label">Lesson complete</p>
      <h1 className="mt-3 text-2xl font-semibold text-white">Well done</h1>
      <p className="mt-2 text-base text-[#8b8b9e]">{headline}</p>
      <p className="mt-1 text-sm text-[#6b6b80]">{categoryName}</p>

      <div className="mt-8 flex gap-3">
        <Panel className="flex-1 p-4">
          <p className="text-2xl font-semibold tabular-nums text-white">{practiced}</p>
          <p className="mt-1 text-xs text-[#6b6b80]">Practiced</p>
        </Panel>
        <Panel className="flex-1 p-4">
          <p className="text-2xl font-semibold tabular-nums text-white">{newlyLearned}</p>
          <p className="mt-1 text-xs text-[#6b6b80]">New</p>
        </Panel>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <Button onClick={onHome}>Back to home</Button>
        <Button variant="secondary" onClick={onAgain}>Another lesson</Button>
      </div>
    </div>
  )
}
