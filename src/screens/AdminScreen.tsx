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
  syncAllLocalAudioToCloud,
  upsertCustomPhrase,
} from '../services/customPhrases'
import { Button } from '../components/ui/Button'
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
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
        playing
          ? 'border-violet/30 bg-violet/10 text-violet'
          : 'border-white/15 bg-white/5 text-white hover:bg-white/8'
      }`}
    >
      {playing ? 'Pause' : label}
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
        <div className="flex items-center gap-2">
          <PlayButton url={savedUrl} label="Play" />
          <span className="flex-1 text-xs text-[#6b6b80]">Saved</span>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="rounded-lg border border-rose/25 px-2 py-1 text-xs font-medium text-rose hover:bg-rose/10"
          >
            Delete
          </button>
        </div>
      )}

      {state === 'recording' && (
        <button
          type="button"
          onClick={stop}
          className="w-full rounded-lg border border-rose/30 bg-rose/10 py-2 text-xs font-semibold text-rose"
        >
          {fmt(secs)} — Stop recording
        </button>
      )}

      {state === 'done' && blob && previewUrl && (
        <div className="flex flex-col gap-2">
          <PlayButton url={previewUrl} label="Preview" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="flex-1 rounded-lg border border-white/20 bg-white py-2 text-xs font-semibold text-[#0e0e12] disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save voice'}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={saving}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-[#8b8b9e]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {(state === 'idle' || state === 'error') && (
        <button
          type="button"
          onClick={start}
          className="w-full rounded-lg border border-white/15 py-2 text-xs font-semibold text-white hover:bg-white/5"
        >
          {hasAudio ? 'Re-record' : 'Record voice'}
        </button>
      )}

      {(errorMsg || saveError) && (
        <p className="text-xs text-rose">{errorMsg ?? saveError}</p>
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
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <button type="submit" className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-white px-4 py-3 text-[15px] font-semibold text-[#0e0e12]">Save phrase</button>
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
              <span className="rounded-md bg-white/8 px-2 py-0.5 text-[10px] font-medium text-[#8b8b9e]">Audio</span>
            )}
            {phrase.custom && (
              <span className="rounded-md bg-white/8 px-2 py-0.5 text-[10px] font-medium text-[#8b8b9e]">Custom</span>
            )}
          </div>
          <p className="mt-0.5 text-xs font-semibold text-[#5a5a72]">{phrase.english}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              expanded ? 'border-white/25 bg-white/10 text-white' : 'border-white/10 text-[#8b8b9e] hover:text-white'
            }`}
          >
            {expanded ? 'Close' : 'Audio'}
          </button>
          <button type="button" onClick={onEdit} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-[#8b8b9e] hover:text-white" title="Edit">Edit</button>
          {!isBuiltIn && (
            <button type="button" onClick={onDelete} className="rounded-lg border border-rose/20 px-2.5 py-1.5 text-xs font-medium text-rose hover:bg-rose/10" title="Delete">Del</button>
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
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const refresh = useCallback(() => setPhrases(allPhrases()), [])

  const handleSyncCloud = async () => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const { ok, failed } = await syncAllLocalAudioToCloud()
      setSyncMsg(
        failed > 0
          ? `Shared ${ok} voices. ${failed} failed — try again.`
          : ok === 0
            ? 'No local voices found to share. Record some first.'
            : `Shared ${ok} voices with everyone. ✓`,
      )
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const visible = phrases.filter((p) => {
    const catOk = filter === 'all' || p.categoryId === filter
    const q = search.toLowerCase()
    return catOk && (!q || p.luganda.toLowerCase().includes(q) || p.english.toLowerCase().includes(q))
  })

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col bg-[#0e0e12] px-4 pb-10 pt-6">
      <header className="mb-5 flex items-center gap-3">
        <Button variant="secondary" onClick={onClose} className="!w-auto shrink-0 px-4">Back</Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-white">Admin</h1>
          <p className="text-xs text-[#6b6b80]">{phrases.length} phrases</p>
        </div>
        <button type="button" onClick={() => setEditing('new')} className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0e0e12]">Add</button>
      </header>

      <div className="mb-4 rounded-xl border border-white/10 bg-[#16161d] p-3">
        <p className="text-xs text-[#8b8b9e]">
          New recordings upload to the cloud automatically. If people still can&apos;t hear older voices, share them once:
        </p>
        <button
          type="button"
          onClick={() => void handleSyncCloud()}
          disabled={syncing}
          className="mt-2 w-full rounded-lg border border-white/15 py-2.5 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-50"
        >
          {syncing ? 'Sharing voices…' : 'Share all voices with everyone'}
        </button>
        {syncMsg && (
          <p className="mt-2 text-xs text-[#a1a1b5]">{syncMsg}</p>
        )}
      </div>

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
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === id
                  ? 'bg-white text-[#0e0e12]'
                  : 'border border-white/10 text-[#8b8b9e] hover:text-white'
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
