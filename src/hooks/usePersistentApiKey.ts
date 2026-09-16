/**
 * A bring-your-own API key that persists in `localStorage`, so the user enters
 * it once and it survives reloads and browser restarts — cleared only when they
 * clear site data (the browser's "cookies and site data" control) or call
 * `clear()`.
 *
 * localStorage, not a cookie, on purpose: this app is static-hosted with no
 * backend of its own, so the key is never sent to our origin. A cookie would
 * ride every request to S3/CloudFront for nothing, is capped at ~4 KB, and —
 * since only client JS reads the key — couldn't be `HttpOnly`, so it buys no
 * security over localStorage while adding needless transmission. Same
 * "persists until you delete it" property either way.
 *
 * `slot` namespaces distinct keys so they don't collide — `'llm'` for the chat
 * provider key, `'elevenlabs'` for the voice key.
 */
import { useCallback, useEffect, useState } from 'react'

// The storage namespace keeps the viewer's original name on purpose: every
// persisted key (here and in the sibling hooks) lives under it, and renaming
// it would silently drop each visitor's saved keys. Nobody sees the prefix.
const STORAGE_PREFIX = 'holon-viewer:apikey:'
// Same-tab change signal — the `storage` event only fires in OTHER tabs, so this
// keeps two instances of the same slot in one tab in sync (e.g. the chat
// drawer's 'llm' instance tracking the keys drawer's).
const CHANGE_EVENT = 'holon-viewer:apikey-change'

function read(storageKey: string): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(storageKey) ?? ''
  } catch {
    // localStorage can throw in private mode or when storage is disabled.
    return ''
  }
}

export interface PersistentApiKey {
  /** The current key ('' when none is stored). */
  key: string
  /** Set (or, with '', remove) the key; updates both state and storage. */
  setKey: (value: string) => void
  /** Remove the stored key. */
  clear: () => void
  /** True when a non-empty key is stored. */
  isStored: boolean
}

export function usePersistentApiKey(slot: string): PersistentApiKey {
  const storageKey = STORAGE_PREFIX + slot
  const [key, setKeyState] = useState<string>(() => read(storageKey))

  // A slot change (unusual, but keep it correct) re-reads the new slot.
  useEffect(() => {
    setKeyState(read(storageKey))
  }, [storageKey])

  const setKey = useCallback(
    (value: string) => {
      setKeyState(value)
      try {
        if (value) window.localStorage.setItem(storageKey, value)
        else window.localStorage.removeItem(storageKey)
        window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: storageKey }))
      } catch {
        // Ignore write failures (private mode); the key still works this session.
      }
    },
    [storageKey]
  )

  const clear = useCallback(() => setKey(''), [setKey])

  // Reflect changes made in another tab (`storage`) or another instance in this
  // tab (`CHANGE_EVENT`).
  useEffect(() => {
    const reread = () => setKeyState(read(storageKey))
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey) reread()
    }
    const onLocal = (e: Event) => {
      if ((e as CustomEvent<string>).detail === storageKey) reread()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(CHANGE_EVENT, onLocal)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(CHANGE_EVENT, onLocal)
    }
  }, [storageKey])

  return { key, setKey, clear, isStored: key.length > 0 }
}
