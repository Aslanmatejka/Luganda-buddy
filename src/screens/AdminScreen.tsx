import { useCallback, useEffect, useRef, useState } from 'react'
import { categories, phrases as builtInPhrases } from '../data/content'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import {
  allPhrases,
  deleteCustomPhrase,
  newPhraseId,
  upsertCustomPhrase,
} from '../services/customPhrases'
import { idbLoadAudio, idbRemoveAudio, idbSaveAudio } from '../services/audioDB'
import type { CategoryId, Phrase } from '../types'

const builtInIds = new Set(builtInPhrases.map((p) => p.id))

function emptyDraft(categoryId: CategoryId = 'greetings'): Omit<Phrase, 'id'> {
  return { luganda: '', english: '', pronunciation: '', explanation: '', categoryId }
}

// ─── PreviewPlayer – plays any audio data URL ────────────────────────────────

function PreviewPlayer({ dataUrl, label = '▶ Preview recording' }: { dataUrl: string; label?: string }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const toggle = () => {
    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
      return
    }
    audioRef.current?.pause()
    const a = new Audio(dataUrl)
    audioRef.current = a
    setPlaying(true)
    a.onended = () => setPlaying(false)
    a.onerror = () => setPlaying(false)
    a.play().catch(() => setPlaying(false))
  }

  // Pause when unmounted
  useEffect(() => () => { audioRef.current?.pause() }, [])

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
        playing
          ? 'border-sky/40 bg-sky/15 text-sky'
          : 'border-white/12 bg-white/5 text-[#c0c0d8]'
      }`}
    >
      {playing ? (
        <>
          <span className="flex gap-[3px]">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block h-3.5 w-1 rounded-full bg-sky"
                style={{ animation: `bounce 0.8s ${i * 0.15}s ease-in-out infinite alternate` }}
              />
            ))}
          </span>
          Playing… tap to pause
        </>
      ) : (
        label
      )}
    </button>
  )
}

// ─── Standalone recorder — lives outside the form so it survives re-renders ──

function AudioRecorder({
  phraseId,
  onAudioReady,
}: {
  phraseId: string
  /** Called whenever a recording is successfully saved to IndexedDB */
  onAudioReady: (dataUrl: string) => void
}) {
  const { state, dataUrl, start, stop, reset } = useAudioRecorder()
  const [saved, setSaved]     = useState(false)
  const [current, setCurrent] = useState<string | null>(null)

  // Load existing recording for this phrase
  useEffect(() => {
    setSaved(false)
    idbLoadAudio(phraseId)
      .then((url) => setCurrent(url))
      .catch(() => setCurrent(null))
  }, [phraseId])

  const saveRecording = async (url: string) => {
    await idbSaveAudio(phraseId, url)
    setCurrent(url)
    setSaved(true)
    onAudioReady(url)
    reset()
  }

  const handleSave = () => {
    if (!dataUrl) return
    saveRecording(dataUrl).catch(() =>
      alert('Could not save the recording. Please try again.'),
    )
  }

  const handleDelete = async () => {
    await idbRemoveAudio(phraseId)
    setCurrent(null)
    setSaved(false)
    reset()
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Existing / just-saved recording */}
      {current && state === 'idle' && (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <PreviewPlayer dataUrl={current} label="▶ Play saved recording" />
          </div>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="rounded-xl bg-rose/15 border border-rose/25 px-3 py-2 text-sm font-bold text-rose"
            title="Delete recording"
          >
            🗑
          </button>
        </div>
      )}

      {saved && (
        <p className="text-center text-xs font-extrabold text-emerald">✓ Recording saved!</p>
      )}

      {/* Record button */}
      {state === 'idle' && (
        <button
          type="button"
          onClick={start}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet/30 bg-violet/10 px-3 py-2.5 text-sm font-bold text-violet"
        >
          🎙 {current ? 'Re-record' : 'Record your voice'}
        </button>
      )}

      {/* Recording in progress */}
      {state === 'recording' && (
        <button
          type="button"
          onClick={stop}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose/80 px-3 py-2.5 text-sm font-bold text-white"
          style={{ animation: 'pulse-soft 1.4s ease-in-out infinite' }}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-white" />
          Recording… tap to stop
        </button>
      )}

      {/* Preview + save/discard */}
      {state === 'done' && dataUrl && (
        <div className="flex flex-col gap-2">
          {/* Preview listen before saving */}
          <PreviewPlayer dataUrl={dataUrl} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-xl bg-emerald px-3 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(52,211,153,0.3)]"
            >
              💾 Save recording
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-[#8b8b9e]"
            >
              Discard
            </button>
          </div>
        </div>
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
    initial
      ? { ...initial }
      : { id: newPhraseId('greetings'), ...emptyDraft() },
  )
  // Track the phraseId used for audio separately — it must NOT change when
  // category changes, so the recording stays attached to the right id.
  const [audioId] = useState(() => draft.id)

  const set = (key: keyof Phrase) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setDraft((d) => ({ ...d, [key]: e.target.value }))

  const onCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const catId = e.target.value as CategoryId
    setDraft((d) => ({
      ...d,
      categoryId: catId,
      // Only regenerate id for NEW phrases — and keep audioId unchanged
      id: isNew ? newPhraseId(catId) : d.id,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.luganda.trim() || !draft.english.trim()) return
    // Save with the stable audioId so audio lookup always works
    upsertCustomPhrase({ ...draft, id: audioId })
    onSaved({ ...draft, id: audioId })
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
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-[#8b8b9e]"
          >×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Category */}
          <div>
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-widest text-[#5a5a72]">
              Category
            </label>
            <select value={draft.categoryId} onChange={onCategoryChange} className={inputCls}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>

          {/* Luganda */}
          <div>
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-widest text-[#5a5a72]">
              Luganda word / phrase
            </label>
            <input
              type="text"
              value={draft.luganda}
              onChange={set('luganda')}
              placeholder="e.g. Oli otya?"
              required
              className={inputCls}
            />
          </div>

          {/* English */}
          <div>
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-widest text-[#5a5a72]">
              English meaning
            </label>
            <input
              type="text"
              value={draft.english}
              onChange={set('english')}
              placeholder="e.g. How are you?"
              required
              className={inputCls}
            />
          </div>

          {/* Pronunciation */}
          <div>
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-widest text-[#5a5a72]">
              Pronunciation hint
            </label>
            <input
              type="text"
              value={draft.pronunciation}
              onChange={set('pronunciation')}
              placeholder="e.g. oh-lee oh-CHA"
              className={inputCls}
            />
          </div>

          {/* Explanation */}
          <div>
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-widest text-[#5a5a72]">
              Short explanation
            </label>
            <textarea
              value={draft.explanation}
              onChange={set('explanation')}
              placeholder="A friendly note about this phrase."
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Voice recorder */}
          <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
            <p className="mb-1 text-sm font-bold text-white">🎙 Voice recording</p>
            <p className="mb-3 text-xs font-semibold text-[#5a5a72]">
              Record yourself saying the phrase. Press Save recording before saving the phrase.
            </p>
            <AudioRecorder
              phraseId={audioId}
              onAudioReady={() => {}}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-2xl bg-violet px-4 py-3 font-bold text-white shadow-[0_6px_20px_rgba(139,92,246,0.30)]"
            >
              Save phrase
            </button>
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
  const isBuiltIn   = builtInIds.has(phrase.id)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [playing, setPlaying]   = useState(false)
  const audioRef                = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    idbLoadAudio(phrase.id)
      .then((d) => setAudioUrl(d))
      .catch(() => {})
  }, [phrase.id])

  const togglePlay = () => {
    if (!audioUrl) return
    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
      return
    }
    audioRef.current?.pause()
    const a = new Audio(audioUrl)
    audioRef.current = a
    setPlaying(true)
    a.onended = () => setPlaying(false)
    a.onerror = () => setPlaying(false)
    a.play().catch(() => setPlaying(false))
  }

  return (
    <div className="rounded-2xl border border-white/6 bg-[#16161d] px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[15px] font-semibold text-white">
              {phrase.luganda}
            </span>
            {audioUrl && (
              <span className="rounded-full bg-emerald/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald">
                🎙 voice
              </span>
            )}
            {phrase.custom && (
              <span className="rounded-full bg-violet/15 px-2 py-0.5 text-[10px] font-extrabold text-violet">
                custom
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs font-semibold text-[#5a5a72]">{phrase.english}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {audioUrl && (
            <button
              type="button"
              onClick={togglePlay}
              title={playing ? 'Pause' : 'Play recording'}
              className={`rounded-xl border px-2.5 py-1.5 text-sm font-bold transition ${
                playing
                  ? 'border-sky/40 bg-sky/15 text-sky'
                  : 'border-emerald/30 bg-emerald/10 text-emerald'
              }`}
            >
              {playing ? '⏸' : '▶'}
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl border border-white/8 bg-white/5 px-2.5 py-1.5 text-sm"
            title="Edit"
          >
            ✏️
          </button>
          {!isBuiltIn && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-xl border border-rose/20 bg-rose/10 px-2.5 py-1.5 text-sm"
              title="Delete"
            >
              🗑
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── AdminScreen ──────────────────────────────────────────────────────────────

export function AdminScreen({ onClose }: { onClose: () => void }) {
  const [phrases, setPhrases] = useState<Phrase[]>(() => allPhrases())
  const [filter, setFilter]   = useState<CategoryId | 'all'>('all')
  const [search, setSearch]   = useState('')
  const [editing, setEditing] = useState<Phrase | null | 'new'>(null)

  const refresh = useCallback(() => setPhrases(allPhrases()), [])

  const visible = phrases.filter((p) => {
    const catOk  = filter === 'all' || p.categoryId === filter
    const q      = search.toLowerCase()
    const textOk = !q || p.luganda.toLowerCase().includes(q) || p.english.toLowerCase().includes(q)
    return catOk && textOk
  })

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col bg-[#0e0e12] px-4 pb-10 pt-6">
      {/* Header */}
      <header className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-[#8b8b9e]"
        >
          ← Back
        </button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold text-white">Admin</h1>
          <p className="text-xs font-semibold text-[#5a5a72]">{phrases.length} phrases</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-2xl bg-violet px-4 py-2.5 text-sm font-bold text-white"
        >
          + Add
        </button>
      </header>

      {/* Search */}
      <input
        type="search"
        placeholder="Search…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder:text-[#5a5a72] focus:outline-none focus:ring-2 focus:ring-violet/30"
      />

      {/* Category filter */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {(['all', ...categories.map((c) => c.id)] as const).map((id) => {
          const cat = id === 'all' ? null : categories.find((c) => c.id === id)!
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold transition ${
                filter === id
                  ? 'bg-violet text-white'
                  : 'border border-white/8 bg-white/5 text-[#8b8b9e]'
              }`}
            >
              {cat ? `${cat.emoji} ${cat.name}` : 'All'}
            </button>
          )
        })}
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {visible.length === 0 && (
          <p className="py-10 text-center text-sm font-semibold text-[#5a5a72]">
            Nothing matches.
          </p>
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
