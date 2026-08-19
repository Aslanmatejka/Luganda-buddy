import { categories } from '../data/content'
import { SectionHeading } from './ui/Panel'
import type { CategoryId } from '../types'

export function CategoryGrid({ onChoose }: { onChoose: (id: CategoryId) => void }) {
  return (
    <section>
      <SectionHeading title="Topics" subtitle="Choose a category to practice" />
      <div className="flex flex-col gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChoose(cat.id)}
            className="flex w-full items-center gap-4 rounded-xl border border-white/10 bg-[#16161d] px-4 py-3.5 text-left transition-colors hover:border-white/20 hover:bg-[#1a1a24] active:bg-[#1e1e28]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-lg">
              {cat.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-white">{cat.name}</p>
              <p className="text-xs text-[#6b6b80]">{cat.blurb}</p>
            </div>
            <span className="shrink-0 text-sm text-[#5a5a72]" aria-hidden="true">→</span>
          </button>
        ))}
      </div>
    </section>
  )
}
