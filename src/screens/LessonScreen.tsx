import { useEffect, useMemo, useState } from 'react'
import { ListenButton } from '../components/ListenButton'
import { Mascot } from '../components/Mascot'
import { getCategory } from '../data/content'
import { buildLesson, quizChoices } from '../services/lesson'
import { stopSpeech } from '../services/speech'
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

  useEffect(() => { return () => stopSpeech() }, [])

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
      {/* ── Top bar ── */}
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onExit}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 border border-white/10 text-white/60 transition active:scale-90"
          aria-label="Go home"
        >
          ←
        </button>

        <div className="flex flex-1 gap-1.5">
          {lesson.map((item, i) => (
            <span
              key={item.id}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                i < index  ? 'bg-emerald' :
                i === index ? 'bg-violet' :
                'bg-white/10'
              }`}
            />
          ))}
        </div>

        <span className="min-w-[32px] text-right text-xs font-bold text-[#5a5a72]">
          {index + 1}/{lesson.length}
        </span>
      </header>

      {/* ── Category label ── */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        <span className="rounded-full bg-white/6 border border-white/8 px-3 py-1 text-[11px] font-bold text-[#8b8b9e]">
          {category.emoji} {category.name}
        </span>
      </div>

      {/* ── Step ── */}
      <div key={`${phrase.id}-${step}`} className="animate-pop mt-4 flex flex-1 flex-col">
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

// ─── Learn step ───────────────────────────────────────────────────────────────

function LearnStep({ phrase, onContinue }: { phrase: Phrase; onContinue: () => void }) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex justify-center pt-1">
        <Mascot mood="listen" size={80} />
      </div>

      {/* Word card */}
      <section className="gradient-border relative overflow-hidden rounded-[24px] bg-[#16161d] p-7 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.08),transparent_60%)]" />
        <p className="shimmer-text font-display text-5xl font-semibold leading-tight">
          {phrase.luganda}
        </p>
        <p className="mt-4 text-xl font-bold text-coral">{phrase.english}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/8 px-3 py-1.5">
          <span className="text-sm">🗣</span>
          <span className="text-sm font-semibold text-[#8b8b9e]">{phrase.pronunciation}</span>
        </span>
      </section>

      <ListenButton text={phrase.luganda} audioDataUrl={phrase.audioDataUrl} autoPlay />

      <p className="text-center text-xs font-semibold text-[#5a5a72]">
        Hear it · Whisper it · No pressure
      </p>

      <button
        type="button"
        onClick={onContinue}
        className="mt-auto w-full rounded-2xl bg-emerald px-5 py-4 text-[15px] font-bold text-[#0e0e12] shadow-[0_8px_28px_rgba(52,211,153,0.30)] transition active:scale-[0.97]"
      >
        Ready for the quiz →
      </button>
    </div>
  )
}

// ─── Quiz step ────────────────────────────────────────────────────────────────

function QuizStep({
  phrase, choices, onChoose,
}: { phrase: Phrase; choices: string[]; onChoose: (c: string) => void }) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="text-center">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#5a5a72]">
          What does this mean?
        </p>
        <p className="mt-3 font-display text-4xl font-semibold text-white">
          {phrase.luganda}
        </p>
      </div>

      <div className="mx-auto w-full">
        <ListenButton text={phrase.luganda} audioDataUrl={phrase.audioDataUrl} />
      </div>

      <div className="flex flex-col gap-2.5">
        {choices.map((choice, i) => (
          <button
            key={choice}
            type="button"
            onClick={() => onChoose(choice)}
            className={`animate-slide-up stagger-${Math.min(i + 1, 5)} flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#16161d] px-5 py-4 text-left text-[15px] font-semibold text-white transition active:scale-[0.97] active:bg-white/10`}
          >
            {choice}
            <span className="text-[#3a3a50] text-sm">→</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Feedback step ────────────────────────────────────────────────────────────

function FeedbackStep({
  phrase, correct, picked, isLast, onNext,
}: { phrase: Phrase; correct: boolean; picked: string; isLast: boolean; onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <section
        className={`relative overflow-hidden rounded-[24px] p-6 text-center border ${
          correct
            ? 'bg-emerald/8 border-emerald/25'
            : 'bg-rose/8 border-rose/25'
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04),transparent_60%)]" />
        <p className="animate-bounce-in relative font-display text-4xl font-semibold">
          {correct ? '🎉 Correct!' : '🤔 Not quite'}
        </p>
        <p className="relative mt-3 font-display text-3xl font-semibold text-white">
          {phrase.luganda}
        </p>
        <p className={`relative mt-1 text-lg font-bold ${correct ? 'text-emerald' : 'text-rose'}`}>
          {phrase.english}
        </p>
        {!correct && (
          <p className="relative mt-2 text-xs font-semibold text-[#8b8b9e]">
            You picked "{picked}" — that's fine, now you know it.
          </p>
        )}
        <p className="relative mt-3 text-sm font-medium leading-relaxed text-[#8b8b9e]">
          {phrase.explanation}
        </p>
      </section>

      <ListenButton text={phrase.luganda} audioDataUrl={phrase.audioDataUrl} />

      <button
        type="button"
        onClick={onNext}
        className={`w-full rounded-2xl px-5 py-4 text-[15px] font-bold transition active:scale-[0.97] ${
          correct
            ? 'bg-violet text-white shadow-[0_8px_28px_rgba(139,92,246,0.35)]'
            : 'bg-white/8 border border-white/10 text-white'
        }`}
      >
        {isLast ? 'Finish lesson 🎓' : 'Next →'}
      </button>
    </div>
  )
}
