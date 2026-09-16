import { useEffect, useState } from 'react'
import {
  type CatalogFiling,
  type FilerRow,
  fetchFiler,
  periodOf,
  reportFileUrl,
} from '../../sec/catalog'

interface ReportPickerProps {
  filer: FilerRow
  onSelect: (filing: CatalogFiling) => void
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`
}

/**
 * The selected filer's filings, newest first, from its catalog file on the
 * CDN. Pick one to open its Tavi model or holon; a filing whose artifacts are
 * not written yet is listed but cannot be opened.
 */
export function ReportPicker({ filer, onSelect }: ReportPickerProps) {
  const [filings, setFilings] = useState<CatalogFiling[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setFilings([])
    fetchFiler(filer.ticker)
      .then((catalog) => {
        if (cancelled) return
        setFilings(catalog?.filings ?? [])
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [filer.ticker])

  return (
    <div className="sec-filings">
      <div className="sec-filings-head">
        Filings for <strong>{filer.name}</strong>
        <span className="hint"> · {filer.ticker}</span>
      </div>

      {loading ? (
        <div className="sec-loading">
          <span className="spinner" /> Loading filings…
        </div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : filings.length === 0 ? (
        <div className="hint">No filings listed for this company.</div>
      ) : (
        <ul className="filing-list">
          {filings.map((f) => {
            const openable = reportFileUrl(f) !== null
            return (
              <li key={f.accession}>
                <button
                  type="button"
                  className="filing-item"
                  disabled={!openable}
                  title={openable ? undefined : 'Artifacts pending'}
                  onClick={() => onSelect(f)}
                >
                  <span className="filing-form">{f.form}</span>
                  <span className="filing-meta">
                    {periodOf(f) ? <span className="filing-fy">{periodOf(f)}</span> : null}
                    <span className="filing-date">Filed {formatDate(f.filing_date)}</span>
                    {!openable ? <span className="hint">artifacts pending</span> : null}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
