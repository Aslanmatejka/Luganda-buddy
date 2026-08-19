type MascotMood = 'happy' | 'cheer' | 'listen' | 'think'

export function Mascot({
  mood = 'happy',
  size = 88,
  className = '',
}: {
  mood?: MascotMood
  size?: number
  className?: string
}) {
  return (
    <div className={`animate-float select-none ${className}`} aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        {/* glow halo */}
        <circle cx="40" cy="40" r="36" fill="rgba(139,92,246,0.12)" />
        {/* outer ring */}
        <circle cx="40" cy="40" r="30" fill="url(#body-grad)" />
        {/* face */}
        <circle cx="40" cy="40" r="22" fill="rgba(255,255,255,0.92)" />
        {/* blush */}
        <circle cx="28" cy="46" r="5" fill="rgba(255,107,74,0.22)" />
        <circle cx="52" cy="46" r="5" fill="rgba(255,107,74,0.22)" />
        {/* left eye */}
        {mood === 'cheer' ? (
          <path d="M27 35 Q30 31 33 35" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        ) : (
          <>
            <circle cx="30" cy="36" r="4.2" fill="#1a1a2e" />
            <circle cx="31.6" cy="34.4" r="1.4" fill="white" />
          </>
        )}
        {/* right eye */}
        {mood === 'cheer' ? (
          <path d="M47 35 Q50 31 53 35" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        ) : (
          <>
            <circle cx="50" cy="36" r="4.2" fill="#1a1a2e" />
            <circle cx="51.6" cy="34.4" r="1.4" fill="white" />
          </>
        )}
        {/* mouth */}
        {mood === 'happy'  && <path d="M29 46 Q40 57 51 46" stroke="#1a1a2e" strokeWidth="2.8" strokeLinecap="round" fill="none" />}
        {mood === 'cheer'  && <path d="M26 46 Q40 60 54 46" stroke="#1a1a2e" strokeWidth="3" strokeLinecap="round" fill="none" />}
        {mood === 'listen' && <path d="M31 48 L49 48" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" />}
        {mood === 'think'  && <path d="M31 47 Q38 43 49 47" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" fill="none" />}
        {/* tongue for cheer */}
        {mood === 'cheer' && <ellipse cx="40" cy="54" rx="5.5" ry="4" fill="#ff6b4a" />}
        {/* ears */}
        <circle cx="10" cy="40" r="7.5" fill="url(#ear-grad)" />
        <circle cx="70" cy="40" r="7.5" fill="url(#ear-grad)" />
        <circle cx="10" cy="40" r="4.5" fill="rgba(255,255,255,0.4)" />
        <circle cx="70" cy="40" r="4.5" fill="rgba(255,255,255,0.4)" />
        {/* think bubble */}
        {mood === 'think' && <>
          <circle cx="57" cy="19" r="2.2" fill="rgba(139,92,246,0.55)" />
          <circle cx="63" cy="13" r="3.2" fill="rgba(139,92,246,0.45)" />
          <circle cx="70" cy="6"  r="4.5" fill="rgba(139,92,246,0.35)" />
        </>}
        {/* gradient defs */}
        <defs>
          <radialGradient id="body-grad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#6d28d9" />
          </radialGradient>
          <radialGradient id="ear-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c3aed" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  )
}
