/**
 * The color theme. A pick from the header toggle persists like the other
 * choices; until there is one, the OS setting decides and a change to it is
 * followed live. The theme lands as `data-theme` on `<html>`, which is all the
 * stylesheet keys on.
 *
 * `index.html` sets the same attribute before first paint, so a dark-mode
 * visitor never sees a white flash — the storage key, the rule and the
 * browser-chrome colors below are mirrored there and must stay in step.
 */
import { useCallback, useEffect, useState } from 'react'
import { usePersistentChoice } from './usePersistentChoice'

export type Theme = 'light' | 'dark'

// The `holon-viewer:` prefix is the viewer's storage namespace and never changes.
export const THEME_STORAGE_KEY = 'holon-viewer:theme'

/** The header's surface per theme, for the browser chrome (`theme-color`). */
export const THEME_CHROME: Record<Theme, string> = { light: '#ffffff', dark: '#111827' }

const SYSTEM = 'system'
const DARK_QUERY = '(prefers-color-scheme: dark)'

const isKnown = (id: string): boolean => id === SYSTEM || id === 'light' || id === 'dark'

function systemTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_CHROME[theme])
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const { id, set } = usePersistentChoice({
    storageKey: THEME_STORAGE_KEY,
    defaultId: SYSTEM,
    isKnown,
  })
  const [system, setSystem] = useState<Theme>(systemTheme)

  useEffect(() => {
    const query = window.matchMedia?.(DARK_QUERY)
    if (!query) return
    const onChange = () => setSystem(query.matches ? 'dark' : 'light')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const theme: Theme = id === 'light' || id === 'dark' ? id : system

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggle = useCallback(() => set(theme === 'dark' ? 'light' : 'dark'), [set, theme])
  return { theme, toggle }
}
