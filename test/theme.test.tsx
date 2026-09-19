import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { THEME_CHROME, THEME_STORAGE_KEY, useTheme, type Theme } from '../src/hooks/useTheme'

// Vitest runs from the repo root; the happy-dom environment gives import.meta.url no file scheme.
const read = (path: string): string => readFileSync(join(process.cwd(), path), 'utf8')

/** Stand in for the OS setting; `set` flips it the way a system change does. */
function stubOsTheme(initial: Theme): { set: (next: Theme) => void } {
  let dark = initial === 'dark'
  const listeners = new Set<() => void>()
  window.matchMedia = ((query: string) => ({
    get matches() {
      return query.includes('dark') && dark
    },
    media: query,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  })) as unknown as typeof window.matchMedia
  return {
    set: (next) => {
      dark = next === 'dark'
      listeners.forEach((fn) => fn())
    },
  }
}

const themeAttr = () => document.documentElement.dataset.theme
const chrome = () => document.querySelector('meta[name="theme-color"]')?.getAttribute('content')

beforeEach(() => {
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
  document.head.innerHTML = '<meta name="theme-color" content="#ffffff" />'
})

// index.html sets the theme before React loads, so it must reach the same answer.
describe('the pre-paint script in index.html', () => {
  const page = new DOMParser().parseFromString(read('index.html'), 'text/html')
  const script = page.querySelector('head script:not([src])')?.textContent ?? ''
  const run = () => new Function(script)()

  it('mirrors the hook: its storage key and its dark chrome color', () => {
    expect(script).toContain(`'${THEME_STORAGE_KEY}'`)
    expect(script).toContain(`'${THEME_CHROME.dark}'`)
  })

  it('follows the OS until there is a pick', () => {
    stubOsTheme('dark')
    run()
    expect(themeAttr()).toBe('dark')
    expect(chrome()).toBe(THEME_CHROME.dark)
  })

  it('lets a stored pick win over the OS', () => {
    stubOsTheme('dark')
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light')
    run()
    expect(themeAttr()).toBe('light')
    expect(chrome()).toBe(THEME_CHROME.light)
  })
})

describe('the theme toggle', () => {
  let root: Root
  let toggle: () => void = () => {}

  function Probe() {
    toggle = useTheme().toggle
    return null
  }

  function mount() {
    const host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => root.render(<Probe />))
  }

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  })

  afterEach(() => {
    act(() => root.unmount())
  })

  it('follows a change to the OS setting while there is no pick', () => {
    const os = stubOsTheme('light')
    mount()
    expect(themeAttr()).toBe('light')
    act(() => os.set('dark'))
    expect(themeAttr()).toBe('dark')
    expect(chrome()).toBe(THEME_CHROME.dark)
  })

  it('persists a pick, which then outranks the OS', () => {
    const os = stubOsTheme('dark')
    mount()
    act(() => toggle())
    expect(themeAttr()).toBe('light')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    act(() => os.set('light'))
    act(() => os.set('dark'))
    expect(themeAttr()).toBe('light')
  })
})
