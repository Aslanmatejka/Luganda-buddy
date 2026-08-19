import { WORD_GOAL } from '../data/content'
import { streakLabel } from '../lib/copy'
import { Panel } from './ui/Panel'
import type { Progress } from '../types'

export function ProgressCard({ progress }: { progress: Progress }) {
  const learned = progress.learnedIds.length
  const percent = Math.min(100, Math.round((learned / WORD_GOAL) * 100))
  const fill = Math.max(percent, learned > 0 ? 4 : 0)
  const streak = progress.streak

  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label">Progress</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-white">
            {learned}
            <span className="text-base font-normal text-[#6b6b80]"> / {WORD_GOAL}</span>
          </p>
          <p className="text-xs text-[#8b8b9e]">words learned</p>
        </div>

        {streak > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
            <p className="text-2xl font-semibold tabular-nums text-white">{streak}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#6b6b80]">
              day{streak === 1 ? '' : 's'} streak
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-violet transition-all duration-700 ease-out"
          style={{ width: `${fill}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-[#6b6b80]">
        <span>{streakLabel(progress)}</span>
        <span className="font-medium tabular-nums">{percent}%</span>
      </div>
    </Panel>
  )
}
