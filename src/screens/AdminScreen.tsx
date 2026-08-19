import { useCallback, useEffect, useRef, useState } from 'react'
import { categories, phrases as builtInPhrases } from '../data/content'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import {
  allPhrases,
  deleteCustomPhrase,
  loadAudio,
  newPhraseId,
  removeAudio,
  saveAudio,
  upsertCustomPhrase,
} from '../services/customPhrases'
import { speakLuganda } from '../services/speech'
import type { CategoryId, Phrase } from '../types'

// ─── helpers ─────────────────────────────────────────────────────────────────

const builtInIds = new Set(builtInPhrases.map((p) => p.id))

function emptyDraft(categoryId: CategoryId = 'greetings'): Omit<Phrase, 'id'> {
  return { luganda: '', english: '', pronunciation: '', explanation: '', categoryId }
}

// ─── AudioRow – inline recorder/player for one phrase ────────────────────────

function AudioRow({ phrase, onSaved }: { phrase: Phrase; onSaved: () => void }) {
  const { state, dataUrl, start, stop, reset } = useAudioRecorder()
  const [current, setCurrent] = useState<string | null>(() => loadAudio(phrase.id))
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  const playStored = () => {
    if (!current) return
    const audio = new Audio(current)
    audioRef.current = audio
    setPlaying(true)
    audio.onended = () => setPlaying(false)
    audio.play().catch(() => setPlaying(false))
  }

  const handleSave = () => {
    if (!dataUrl) return
    saveAudio(phrase.id, dataUrl)
    setCurrent(dataUrl)
    reset()
    onSaved()
  }

  const handleDelete = () => {
    removeAudio(phrase.id)
    setCurrent(null)
    reset()
    onSaved()
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {current && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={playing ? () => { audioRef.current?.pause(); setPlaying(false) } : playStored}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sage/30 px-3 py-2 text-sm font-bold text-ink"
          >
            {playing ? '⏸ Playing…' : '▶ Play your recording'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-xl bg-blush/60 px-3 py-2 text-sm font-bold text-ink"
            title="Delete recording"
          >
            🗑
          </button>
        </div>
      )}

      {state === 'idle' && (
        <button
          type="button"
          onClick={start}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-coral/15 px-3 py-2 text-sm font-bold text-coral"
        >
          🎙 {current ? 'Re-record' : 'Record your voice'}
        </button>
      )}

      {state === 'recording' && (
        <button
          type="button"
          onClick={stop}
          className="flex w-full animate-pulse items-center justify-center gap-2 rounded-xl bg-coral px-3 py-2 text-sm font-bold text-white"
        >
          ⏹ Stop recording
        </button>
      )}

      {state === 'done' && dataUrl && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-xl bg-sage px-3 py-2 text-sm font-bold text-white"
          >
            Save recording
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-peach/60 px-3 py-2 text-sm font-bold text-ink"
          >
            Discard
          </button>
        </div>
      )}
    </div>
  )
}

// ─── PhraseModal – add / edit a phrase ───────────────────────────────────────

function PhraseModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Phrase | null
  onClose: () => void
  onSaved: (phrase: Phrase) => void
}) {
  const isNew = !initial
  const [draft, setDraft] = useState<Phrase>(() =>
    initial
      ? { ...initial }
      : { id: newPhraseId('greetings'), ...emptyDraft() },
  )
  const [audioSaved, setAudioSaved] = useState(false)

  const set = (key: keyof Phrase) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setDraft((d) => ({ ...d, [key]: e.target.value }))
  }

  const onCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const catId = e.target.value as CategoryId
    setDraft((d) => ({
      ...d,
      categoryId: catId,
      // generate a fresh id only when creating a new phrase
      id: isNew ? newPhraseId(catId) : d.id,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.luganda.trim() || !draft.english.trim()) return
    upsertCustomPhrase(draft)
    onSaved(draft)
  }

  const inputCls = 'w-full rounded-xl border border-peach bg-cream px-3 py-2.5 text-base font-semibold text-ink placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-coral/40'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center">
      <div className="animate-pop w-full max-w-md overflow-y-auto rounded-t-[28px] bg-cream p-6 pb-10 shadow-xl sm:rounded-[28px]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-ink">
            {isNew ? 'New phrase' : 'Edit phrase'}
          </h2>
          <button type="button" onClick={onClose} className="text-2xl text-muted">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-extrabold text-muted">Category</label>
            <select
              value={draft.categoryId}
              onChange={onCategoryChange}
              className={inputCls}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-extrabold text-muted">Luganda word / phrase</label>
            <input
              type="text"
              value={draft.luganda}
              onChange={set('luganda')}
              placeholder="e.g. Oli otya?"
              required
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-extrabold text-muted">English meaning</label>
            <input
              type="text"
              value={draft.english}
              onChange={set('english')}
              placeholder="e.g. How are you?"
              required
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-extrabold text-muted">Pronunciation hint</label>
            <input
              type="text"
              value={draft.pronunciation}
              onChange={set('pronunciation')}
              placeholder="e.g. oh-lee oh-CHAH"
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-extrabold text-muted">Little explanation</label>
            <textarea
              value={draft.explanation}
              onChange={set('explanation')}
              placeholder="A short, friendly note about this phrase."
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="rounded-2xl bg-card p-4">
            <p className="text-sm font-extrabold text-ink">🎙 Your voice recording</p>
            <p className="mt-0.5 text-xs font-semibold text-muted">
              Record yourself saying the phrase. This plays instead of the robot voice.
            </p>
            <AudioRow
              phrase={draft}
              onSaved={() => setAudioSaved(true)}
            />
            {audioSaved && (
              <p className="mt-2 text-xs font-bold text-sage">Recording saved!</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl bg-peach/50 px-4 py-3 font-extrabold text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-2xl bg-coral px-4 py-3 font-extrabold text-white"
            >
              Save phrase
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── PhraseRow – one row in the list ─────────────────────────────────────────

function PhraseRow({
  phrase,
  onEdit,
  onDelete,
}: {
  phrase: Phrase
  onEdit: () => void
  onDelete: () => void
}) {
  const isBuiltIn = builtInIds.has(phrase.id)
  const hasAudio = Boolean(loadAudio(phrase.id))

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-card px-4 py-3 shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-base font-semibold text-ink">{phrase.luganda}</span>
          {hasAudio && (
            <span className="rounded-full bg-sage/30 px-2 py-0.5 text-xs font-bold text-sage">
              🎙 voice
            </span>
          )}
          {phrase.custom && (
            <span className="rounded-full bg-coral/20 px-2 py-0.5 text-xs font-bold text-coral">
              custom
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm font-semibold text-muted">{phrase.english}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          title="Play TTS"
          onClick={() => speakLuganda(phrase.luganda)}
          className="rounded-xl bg-honey/40 px-2.5 py-1.5 text-sm font-bold text-ink"
        >
          🔊
        </button>
        <button
          type="button"
          title="Edit"
          onClick={onEdit}
          className="rounded-xl bg-sky/50 px-2.5 py-1.5 text-sm font-bold text-ink"
        >
          ✏️
        </button>
        {!isBuiltIn && (
          <button
            type="button"
            title="Delete"
            onClick={onDelete}
            className="rounded-xl bg-blush/60 px-2.5 py-1.5 text-sm font-bold text-ink"
          >
            🗑
          </button>
        )}
      </div>
    </div>
  )
}

// ─── AdminScreen ─────────────────────────────────────────────────────────────

export function AdminScreen({ onClose }: { onClose: () => void }) {
  const [phrases, setPhrases] = useState<Phrase[]>(() => allPhrases())
  const [filter, setFilter] = useState<CategoryId | 'all'>('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Phrase | null | 'new'>(null)

  const refresh = useCallback(() => {
    setPhrases(allPhrases())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const visible = phrases.filter((p) => {
    const catOk = filter === 'all' || p.categoryId === filter
    const q = search.toLowerCase()
    const textOk = !q || p.luganda.toLowerCase().includes(q) || p.english.toLowerCase().includes(q)
    return catOk && textOk
  })

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col bg-cream px-4 pb-10 pt-6">
      {/* Header */}
      <header className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-card px-4 py-2 text-sm font-extrabold text-muted shadow-sm"
        >
          ← Back
        </button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold text-ink">Admin</h1>
          <p className="text-xs font-semibold text-muted">{phrases.length} phrases total</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-2xl bg-coral px-4 py-2.5 text-sm font-extrabold text-white shadow-sm"
        >
          + Add
        </button>
      </header>

      {/* Search */}
      <input
        type="search"
        placeholder="Search Luganda or English…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 w-full rounded-2xl border border-peach bg-card px-4 py-3 text-base font-semibold text-ink placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-coral/30"
      />

      {/* Category filter */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-extrabold ${filter === 'all' ? 'bg-ink text-cream' : 'bg-card text-muted'}`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilter(c.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-extrabold ${filter === c.id ? 'bg-ink text-cream' : 'bg-card text-muted'}`}
          >
            {c.emoji} {c.name}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {visible.length === 0 && (
          <p className="py-10 text-center text-sm font-semibold text-muted">Nothing matches.</p>
        )}
        {visible.map((phrase) => (
          <PhraseRow
            key={phrase.id}
            phrase={phrase}
            onEdit={() => setEditing(phrase)}
            onDelete={() => {
              if (confirm(`Delete "${phrase.luganda}"?`)) {
                deleteCustomPhrase(phrase.id)
                refresh()
              }
            }}
          />
        ))}
      </div>

      {/* Modal */}
      {editing && (
        <PhraseModal
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}
