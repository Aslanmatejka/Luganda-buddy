import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-white text-[#0e0e12] border border-white hover:bg-white/90 shadow-sm',
  secondary:
    'bg-transparent text-white border border-white/20 hover:bg-white/5 hover:border-white/30',
  ghost:
    'bg-transparent text-[#a1a1b5] border border-transparent hover:text-white hover:bg-white/5',
  danger:
    'bg-rose/10 text-rose border border-rose/25 hover:bg-rose/15',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[15px] font-semibold transition-colors active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${VARIANT[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function IconButton({
  className = '',
  children,
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-[#a1a1b5] transition-colors hover:bg-white/10 hover:text-white active:scale-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
