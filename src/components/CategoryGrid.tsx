import { categories } from '../data/content'
import type { CategoryId } from '../types'

const STYLES: Record<CategoryId, { glow: string; icon: string; border: string }> = {
  greetings: { glow: 'bg-coral/10',   icon: 'bg-coral/20 text-coral',    border: 'border-coral/20' },
  family:    { glow: 'bg-rose/10',    icon: 'bg-rose/20 text-rose',      border: 'border-rose/20' },
  food:      { glow: 'bg-amber/10',   icon: 'bg-amber/20 text-amber',    border: 'border-amber/20' },
  everyday:  { glow: 'bg-emerald/10', icon: 'bg-emerald/20 text-emerald', border: 'border-emerald/20' },
  fun:       { glow: 'bg-violet/10',  icon: 'bg-violet/20 text-violet',  border: 'border-violet/20' },
}

export function CategoryGrid({ onChoose }: { onChoose: (id: CategoryId) => void }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-[#5a5a72]">
        Pick a topic
      </h2>
      <div className="grid grid-cols-2 gap-2.5">
        {categories.map((cat, i) => {
          const s = STYLES[cat.id]
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChoose(cat.id)}
              className={`animate-slide-up stagger-${Math.min(i + 1, 5)} group relative overflow-hidden rounded-[18px] border ${s.border} bg-[#16161d] p-4 text-left transition active:scale-[0.96] ${i === categories.length - 1 ? 'col-span-2' : ''}`}
            >
              {/* hover wash */}
              <div className={`pointer-events-none absolute inset-0 ${s.glow} opacity-0 transition-opacity group-active:opacity-100`} />
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-lg ${s.icon}`}>
                {cat.emoji}
              </span>
              <p className="mt-2 font-display text-[15px] font-semibold text-white">
                {cat.name}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-[#5a5a72]">
                {cat.blurb}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
