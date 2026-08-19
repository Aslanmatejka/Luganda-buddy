import type { ReactNode } from 'react'

export function Panel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-[#16161d] ${className}`}
    >
      {children}
    </section>
  )
}

export function SectionHeading({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {subtitle && (
        <p className="mt-0.5 text-xs text-[#6b6b80]">{subtitle}</p>
      )}
    </div>
  )
}
