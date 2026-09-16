import { useEffect, useRef, useState } from 'react'
import { type FilerRow, loadFilerIndex, searchFilers } from '../../sec/catalog'

interface TickerSearchProps {
  onSelect: (filer: FilerRow) => void
  /** The currently-selected filer, shown as the input's resting value. */
  selected: FilerRow | null
}

/**
 * Filer search — type a ticker or a name. The filer index is fetched once, on
 * the first search, and matched in memory: ticker first, then name. Keyboard:
 * ↑/↓ to move, Enter to pick, Esc to close.
 */
export function TickerSearch({ onSelect, selected }: TickerSearchProps) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<FilerRow[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  // Debounced search. A stale-response guard (`current`) keeps a slow earlier
  // query from overwriting a newer one.
  useEffect(() => {
    const q = term.trim()
    if (!q) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    let current = true
    const handle = setTimeout(() => {
      loadFilerIndex()
        .then((rows) => {
          if (!current) return
          setResults(searchFilers(rows, q))
          setError(null)
          setActive(0)
          setLoading(false)
        })
        .catch((e: unknown) => {
          if (!current) return
          setResults([])
          setError(e instanceof Error ? e.message : String(e))
          setLoading(false)
        })
    }, 250)
    return () => {
      current = false
      clearTimeout(handle)
    }
  }, [term])

  // Close on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const choose = (filer: FilerRow) => {
    onSelect(filer)
    setTerm('')
    setResults([])
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const pick = results[active]
      if (pick) choose(pick)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const placeholder = selected
    ? `${selected.ticker} — ${selected.name}`
    : 'Search by ticker or company name…'

  return (
    <div className="sec-search" ref={boxRef}>
      <input
        className="sec-search-input"
        type="text"
        value={term}
        placeholder={placeholder}
        onChange={(e) => {
          setTerm(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        autoComplete="off"
      />
      {open && term.trim() ? (
        <ul className="sec-suggest" role="listbox">
          {loading ? (
            <li className="sec-suggest-empty">Searching…</li>
          ) : error ? (
            <li className="sec-suggest-empty">Could not load the filer list: {error}</li>
          ) : results.length === 0 ? (
            <li className="sec-suggest-empty">No companies found</li>
          ) : (
            results.map((r, i) => (
              <li key={r.cik}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  className={i === active ? 'sec-suggest-item active' : 'sec-suggest-item'}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(r)}
                >
                  <span className="sec-suggest-ticker">{r.ticker}</span>
                  <span className="sec-suggest-name">
                    {r.name}
                    {r.exchange ? <span className="hint"> · {r.exchange}</span> : null}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}
