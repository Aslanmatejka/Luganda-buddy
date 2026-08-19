import { useAudioUrl } from '../hooks/useAudioUrl'
import { Button } from './ui/Button'
import { Panel, SectionHeading } from './ui/Panel'
import type { Phrase } from '../types'

export function ChallengeCard({ phrase }: { phrase: Phrase }) {
  const { url: audioUrl } = useAudioUrl(phrase.id)

  const play = () => {
    if (audioUrl) new Audio(audioUrl).play().catch(() => {})
  }

  return (
    <Panel className="p-5">
      <SectionHeading
        title="Daily challenge"
        subtitle="Try this phrase with Aslan today"
      />
      <p className="text-2xl font-semibold text-white">{phrase.luganda}</p>
      <p className="mt-1 text-sm text-[#8b8b9e]">{phrase.english}</p>
      <div className="mt-4">
        <Button variant="secondary" onClick={play} disabled={!audioUrl}>
          {audioUrl ? 'Listen & practice' : 'No recording yet'}
        </Button>
      </div>
    </Panel>
  )
}
