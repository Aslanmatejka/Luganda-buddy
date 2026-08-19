import type { CategoryId, Screen } from '../types'

const CATEGORIES = new Set<CategoryId>(['greetings', 'family', 'food', 'everyday', 'fun'])

export function screenFromHash(hash: string): Screen {
  const path = hash.replace(/^#/, '').replace(/^\//, '').trim()

  if (path === 'admin') return { name: 'admin' }

  if (path.startsWith('lesson/')) {
    const cat = path.slice('lesson/'.length).split('/')[0] as CategoryId
    if (CATEGORIES.has(cat)) return { name: 'lesson', categoryId: cat }
  }

  if (path === 'lesson') return { name: 'lesson', categoryId: 'greetings' }

  return { name: 'home' }
}

export function hashFromScreen(screen: Screen): string {
  switch (screen.name) {
    case 'admin':
      return '#/admin'
    case 'lesson':
      return `#/lesson/${screen.categoryId ?? 'greetings'}`
    case 'complete':
      // Transient screen — keep a stable hash but refresh returns home
      return '#/'
    case 'home':
    default:
      return '#/'
  }
}

export function readScreenFromLocation(): Screen {
  return screenFromHash(window.location.hash)
}

export function writeScreenToLocation(screen: Screen, replace = false): void {
  const next = hashFromScreen(screen)
  const current = window.location.hash || '#/'
  if (current === next) return

  const url = new URL(window.location.href)
  url.hash = next

  if (replace) {
    window.history.replaceState(null, '', url)
  } else {
    window.location.hash = next
  }
}
