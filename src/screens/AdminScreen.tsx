import { useCallback, useEffect, useRef, useState } from 'react'
import { categories, phrases as builtInPhrases } from '../data/content'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { useAudioUrl } from '../hooks/useAudioUrl'
import {
  allPhrases,
  deleteCustomPhrase,
  newPhraseId,
  removeAudio,
  saveAudio,
  upsertCustomPhrase,
} from '../services/customPhrases'
import type { CategoryId, Phrase } from '../types'

const builtInIds = new Set(builtInPhrases.map((p) => p.id))

function emptyDraft(categoryId: CategoryId = 'greetings'): Omit<Phrase, 'id'> {
  return { luganda: '', english: '', pronunciation: '', explanation: '', categoryId }
}

// ─── PlayButton ───────────────────────────────────────────────────────────────

function PlayButton({ url, label = '▶' }: { url: string; label?: string }) {
  const [playing, setPlaying] = useState(false)
  const ref = useRef<HTMLAudioElement | null>(null)

  useEffect(() => () => { ref.current?.pause() }, [])

  const toggle = () => {
    if (playing) {
      ref.current?.pause()
      setPlaying(false)
      return
    }
    ref.current?.pause()
    const a = new Audio(url)
    ref.current = a
    setPlaying(true)
    a.onended = () => setPlaying(false)
    a.onerror = () => setPlaying(false)
    a.play().catch(() => setPlaying(false))
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`rounded-xl border px-2.5 py-1.5 text-sm font-bold transition ${
        playing
          ? 'border-sky/40 bg-sky/15 text-sky'
          : 'border-emerald/30 bg-emerald/10 text-emerald'
      }`}
    >
      {playing ? '⏸' : label}
    </button>
  )
}

// ─── PhraseAudioControls — inline record + play for one phrase ───────────────

function PhraseAudioControls({ phraseId }: { phraseId: string }) {
  const { state, blob, previewUrl, errorMsg, start, stop, reset } = useAudioRecorder()
  const { url: savedUrl, hasAudio, reload } = useAudioUrl(phraseId)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [secs, setSecs] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Recording timer
  useEffect(() => {
    if (state === 'recording') {
      setSecs(0)
      timerRef.current = setInterval(() => setSecs((s) => s + 1), 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [state])

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const handleSave = async () => {
    if (!blob) return
    setSaving(true)
    setSaveError(null)
    try {
      await saveAudio(phraseId, blob)
      reset()
      await reload()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    await removeAudio(phraseId)
    reset()
    await reload()
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5 border-t border-white/6 pt-2">
      {/* Saved recording */}
      {hasAudio && savedUrl && state !== 'done' && (
        <div className="flex items-center gap-1.5">
          <PlayButton url={savedUrl} label="▶ Play" />
          <span className="flex-1 text-[10px] font-bold text-emerald">Voice saved ✓</span>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="rounded-lg border border-rose/20 bg-rose/10 px-2 py-1 text-xs font-bold text-rose"
          >
            🗑
          </button>
        </div>
      )}

      {/* Recording in progress */}
      {state === 'recording' && (
        <button
          type="button"
          onClick={stop}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose/80 py-2 text-xs font-bold text-white"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          {fmt(secs)} — tap to stop
        </button>
      )}

      {/* Preview + save after recording */}
      {state === 'done' && blob && previewUrl && (
        <div className="flex flex-col gap-1.5">
          <PlayButton url={previewUrl} label="▶ Preview" />
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="flex-1 rounded-xl bg-emerald py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : '💾 Save voice'}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={saving}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-[#8b8b9e]"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Record button */}
      {(state === 'idle' || state === 'error') && (
        <button
          type="button"
          onClick={start}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-violet/25 bg-violet/10 py-2 text-xs font-bold text-violet"
        >
          🎙 {hasAudio ? 'Re-record' : 'Record voice'}
        </button>
      )}

      {(errorMsg || saveError) && (
        <p className="text-[10px] font-semibold text-rose">⚠️ {errorMsg ?? saveError}</p>
      )}
    </div>
  )
}

// ─── PhraseModal ──────────────────────────────────────────────────────────────

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
    initial ? { ...initial } : { id: newPhraseId('greetings'), ...emptyDraft() },
  )

  const set = (key: keyof Phrase) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setDraft((d) => ({ ...d, [key]: e.target.value }))

  const onCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const catId = e.target.value as CategoryId
    setDraft((d) => ({
      ...d,
      categoryId: catId,
      id: isNew ? newPhraseId(catId) : d.id,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.luganda.trim() || !draft.english.trim()) return
    upsertCustomPhrase({ ...draft, custom: true })
    onSaved(draft)
  }

  const inputCls =
    'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-base font-semibold text-white placeholder:text-[#5a5a72] focus:outline-none focus:border-violet/50 focus:ring-2 focus:ring-violet/20'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md sm:items-center">
      <div className="animate-pop w-full max-w-md overflow-y-auto rounded-t-[28px] border border-white/10 bg-[#16161d] p-6 pb-10 sm:rounded-[28px]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-white">
            {isNew ? 'New phrase' : 'Edit phrase'}
          </h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-[#8b8b9e]">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-widest text-[#5a5a72]">Category</label>
            <select value={draft.categoryId} onChange={onCategoryChange} className={inputCls}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-widest text-[#5a5a72]">Luganda</label>
            <input type="text" value={draft.luganda} onChange={set('luganda')} required className={inputCls} placeholder="e.g. Oli otya?" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-widest text-[#5a5a72]">English</label>
            <input type="text" value={draft.english} onChange={set('english')} required className={inputCls} placeholder="e.g. How are you?" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-widest text-[#5a5a72]">Pronunciation</label>
            <input type="text" value={draft.pronunciation} onChange={set('pronunciation')} className={inputCls} placeholder="e.g. oh-lee oh-CHA" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-widest text-[#5a5a72]">Explanation</label>
            <textarea value={draft.explanation} onChange={set('explanation')} rows={2} className={`${inputCls} resize-none`} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white">Cancel</button>
            <button type="submit" className="flex-1 rounded-2xl bg-violet px-4 py-3 font-bold text-white">Save phrase</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── PhraseRow ────────────────────────────────────────────────────────────────

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
  const [expanded, setExpanded] = useState(false)
  const { hasAudio } = useAudioUrl(phrase.id)

  return (
    <div className="rounded-2xl border border-white/6 bg-[#16161d] px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[15px] font-semibold text-white">{phrase.luganda}</span>
            {hasAudio && (
              <span className="rounded-full bg-emerald/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald">🎙 voice</span>
            )}
            {phrase.custom && (
              <span className="rounded-full bg-violet/15 px-2 py-0.5 text-[10px] font-extrabold text-violet">custom</span>
            )}
          </div>
          <p className="mt-0.5 text-xs font-semibold text-[#5a5a72]">{phrase.english}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={`rounded-xl border px-2.5 py-1.5 text-sm font-bold transition ${
              expanded ? 'border-violet/40 bg-violet/15 text-violet' : 'border-white/8 bg-white/5 text-[#8b8b9e]'
            }`}
            title="Record / play voice"
          >
            🎙
          </button>
          <button type="button" onClick={onEdit} className="rounded-xl border border-white/8 bg-white/5 px-2.5 py-1.5 text-sm" title="Edit">✏️</button>
          {!isBuiltIn && (
            <button type="button" onClick={onDelete} className="rounded-xl border border-rose/20 bg-rose/10 px-2.5 py-1.5 text-sm" title="Delete">🗑</button>
          )}
        </div>
      </div>

      {expanded && (
        <PhraseAudioControls phraseId={phrase.id} />
      )}
    </div>
  )
}

// ─── AdminScreen ──────────────────────────────────────────────────────────────

export function AdminScreen({ onClose }: { onClose: () => void }) {
  const [phrases, setPhrases] = useState<Phrase[]>(() => allPhrases())
  const [filter, setFilter] = useState<CategoryId | 'all'>('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Phrase | null | 'new'>(null)

  const refresh = useCallback(() => setPhrases(allPhrases()), [])

  const visible = phrases.filter((p) => {
    const catOk = filter === 'all' || p.categoryId === filter
    const q = search.toLowerCase()
    return catOk && (!q || p.luganda.toLowerCase().includes(q) || p.english.toLowerCase().includes(q))
  })

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col bg-[#0e0e12] px-4 pb-10 pt-6">
      <header className="mb-5 flex items-center gap-3">
        <button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-[#8b8b9e]">← Back</button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold text-white">Admin</h1>
          <p className="text-xs font-semibold text-[#5a5a72]">{phrases.length} phrases · tap 🎙 to record</p>
        </div>
        <button type="button" onClick={() => setEditing('new')} className="rounded-2xl bg-violet px-4 py-2.5 text-sm font-bold text-white">+ Add</button>
      </header>

      <input
        type="search"
        placeholder="Search…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder:text-[#5a5a72] focus:outline-none focus:ring-2 focus:ring-violet/30"
      />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {(['all', ...categories.map((c) => c.id)] as const).map((id) => {
          const cat = id === 'all' ? null : categories.find((c) => c.id === id)!
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold transition ${
                filter === id ? 'bg-violet text-white' : 'border border-white/8 bg-white/5 text-[#8b8b9e]'
              }`}
            >
              {cat ? `${cat.emoji} ${cat.name}` : 'All'}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-2">
        {visible.length === 0 && (
          <p className="py-10 text-center text-sm font-semibold text-[#5a5a72]">Nothing matches.</p>
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

      {editing && (
        <PhraseModal
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh() }}
        />
      )}
    </div>
  )
}
