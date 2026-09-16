/**
 * Mode B — the SEC filing catalog on the RoboSystems public data CDN. No key,
 * no backend: search a listed filer, pick a filing, and the viewer opens its
 * Tavi model (or holon) by URL — the same file `xbrlkit` writes and the
 * roboinvestor company pages render. The opened report is handed to `App`
 * like a dropped file, so the chat runs over it the same way: jq or SPARQL,
 * in the browser.
 */
import type { NormalizedReport } from '@robosystems/report-components'
import { useCallback, useState } from 'react'
import type { ReportSource } from '../ai/source'
import type { CatalogFiling, FilerRow } from '../sec/catalog'
import { ReportPicker } from './sec/ReportPicker'
import { ReportScreen } from './sec/ReportScreen'
import { TickerSearch } from './sec/TickerSearch'

interface SecModeProps {
  /** The loaded report, owned by `App`. */
  report: NormalizedReport | null
  /** Called when a filing's report parses — with its queryable form for the chat. */
  onLoaded: (report: NormalizedReport, source: ReportSource, name: string) => void
  /** Clear the loaded report. */
  onReset: () => void
}

export function SecMode({ report, onLoaded, onReset }: SecModeProps) {
  const [filer, setFiler] = useState<FilerRow | null>(null)
  const [filing, setFiling] = useState<CatalogFiling | null>(null)

  const changeFiling = useCallback(() => {
    setFiling(null)
    onReset()
  }, [onReset])

  if (filer && filing) {
    return (
      <ReportScreen
        filer={filer}
        filing={filing}
        report={report}
        onLoaded={onLoaded}
        onBack={changeFiling}
      />
    )
  }

  return (
    <div className="sec-browse">
      <div className="sec-browse-head">
        <div>
          <h2>SEC EDGAR</h2>
          <p className="hint">
            Every listed filer&apos;s 10-K, 10-Q, 20-F and 40-F since 2024, as{' '}
            <code>tavi.json</code> and <code>holon.jsonld</code> on the RoboSystems public data CDN.
            No key, no sign-up — search a company and open a filing.
          </p>
        </div>
      </div>

      <TickerSearch
        selected={filer}
        onSelect={(f) => {
          setFiler(f)
          setFiling(null)
        }}
      />

      {filer ? (
        <ReportPicker filer={filer} onSelect={setFiling} />
      ) : (
        <div className="sec-empty">
          <p className="hint">Start typing a ticker (e.g. NVDA) or a company name.</p>
        </div>
      )}
    </div>
  )
}
