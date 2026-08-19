import { useMemo, useState } from 'react'
import { ListenButton } from '../components/ListenButton'
import { Button, IconButton } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'
import { getCategory } from '../data/content'
import { buildLesson, quizChoices } from '../services/lesson'
import type { CategoryId, Phrase } from '../types'

type Step = 'learn' | 'quiz' | 'feedback'

export function LessonScreen({
  categoryId,
  learnedIds,
  onExit,
  onFinish,
}: {
  categoryId: CategoryId
  learnedIds: string[]
  onExit: () => void
  onFinish: (phrases: Phrase[]) => void
}) {
  const category = getCategory(categoryId)
  const lesson = useMemo(() => buildLesson(learnedIds, categoryId), [learnedIds, categoryId])
  const [index, setIndex] = useState(0)
  const [step, setStep] = useState<Step>('learn')
  const [picked, setPicked] = useState<string | null>(null)
  const phrase = lesson[index]
  const choices = useMemo(() => (phrase ? quizChoices(phrase) : []), [phrase])

  if (!phrase) return null

  const correct = picked === phrase.english
  const isLast = index === lesson.length - 1

  const goNext = () => {
    if (isLast) { onFinish(lesson); return }
    setIndex((v) => v + 1)
    setStep('learn')
    setPicked(null)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-10 pt-5">
      <header className="flex items-center gap-3">
        <IconButton label="Go home" onClick={onExit}>←</IconButton>
        <div className="flex flex-1 gap-1">
          {lesson.map((item, i) => (
            <span
              key={item.id}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < index ? 'bg-violet' : i === index ? 'bg-white/40' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
        <span className="min-w-[36px] text-right text-xs tabular-nums text-[#6b6b80]">
          {index + 1}/{lesson.length}
        </span>
      </header>

      <p className="mt-4 text-center text-xs text-[#6b6b80]">
        {category.emoji} {category.name}
      </p>

      <div key={`${phrase.id}-${step}`} className="mt-5 flex flex-1 flex-col">
        {step === 'learn' && (
          <LearnStep phrase={phrase} onContinue={() => setStep('quiz')} />
        )}
        {step === 'quiz' && (
          <QuizStep phrase={phrase} choices={choices} onChoose={(ch) => { setPicked(ch); setStep('feedback') }} />
        )}
        {step === 'feedback' && picked && (
          <FeedbackStep phrase={phrase} correct={correct} picked={picked} isLast={isLast} onNext={goNext} />
        )}
      </div>
    </div>
  )
}

function LearnStep({ phrase, onContinue }: { phrase: Phrase; onContinue: () => void }) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <Panel className="p-6 text-center">
        <p className="text-3xl font-semibold leading-tight text-white">{phrase.luganda}</p>
        <p className="mt-3 text-lg font-medium text-[#c4c4d4]">{phrase.english}</p>
        <p className="mt-2 text-sm text-[#6b6b80]">{phrase.pronunciation}</p>
      </Panel>

      <ListenButton phraseId={phrase.id} autoPlay />

      <p className="text-center text-xs text-[#5a5a72]">Listen, then continue when ready</p>

      <div className="mt-auto">
        <Button onClick={onContinue}>Continue to quiz</Button>
      </div>
    </div>
  )
}

function QuizStep({
  phrase, choices, onChoose,
}: { phrase: Phrase; choices: string[]; onChoose: (c: string) => void }) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="text-center">
        <p className="label">What does this mean?</p>
        <p className="mt-3 text-2xl font-semibold text-white">{phrase.luganda}</p>
      </div>

      <ListenButton phraseId={phrase.id} />

      <div className="flex flex-col gap-2">
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => onChoose(choice)}
            className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-[#16161d] px-4 py-3.5 text-left text-[15px] font-medium text-white transition-colors hover:border-white/25 hover:bg-[#1a1a24] active:bg-[#1e1e28]"
          >
            {choice}
            <span className="text-[#5a5a72]" aria-hidden="true">→</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function FeedbackStep({
  phrase, correct, picked, isLast, onNext,
}: { phrase: Phrase; correct: boolean; picked: string; isLast: boolean; onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <Panel
        className={`p-6 text-center ${
          correct ? 'border-emerald/25 bg-emerald/5' : 'border-amber/25 bg-amber/5'
        }`}
      >
        <p className="text-lg font-semibold text-white">
          {correct ? 'Correct' : 'Not quite'}
        </p>
        <p className="mt-3 text-2xl font-semibold text-white">{phrase.luganda}</p>
        <p className="mt-1 text-base font-medium text-[#c4c4d4]">{phrase.english}</p>
        {!correct && (
          <p className="mt-2 text-xs text-[#8b8b9e]">You chose "{picked}"</p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-[#8b8b9e]">{phrase.explanation}</p>
      </Panel>

      <ListenButton phraseId={phrase.id} />

      <Button variant={correct ? 'primary' : 'secondary'} onClick={onNext}>
        {isLast ? 'Finish lesson' : 'Next phrase'}
      </Button>
    </div>
  )
}
