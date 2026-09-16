/**
 * The SEC lane, and the page `/` opens on — the SEC filing catalog on the
 * RoboSystems public data CDN. No key, no backend: search a listed filer,
 * pick a filing, and the viewer opens its Tavi model (or holon) by URL — the
 * same file `xbrlkit` writes and the roboinvestor company pages render. The
 * opened report is handed to `App` like a dropped file, so the chat runs over
 * it the same way: jq or SPARQL, in the browser.
 */
import type { NormalizedReport } from '@robosystems/report-components'
import type { MouseEvent } from 'react'
import { useCallback, useState } from 'react'
import type { ReportSource } from '../ai/source'
import type { Lane } from '../pages/route'
import { pathForLane } from '../pages/route'
import { type CatalogFiling, type FilerRow, loadFilerIndex } from '../sec/catalog'
import { ReportPicker } from './sec/ReportPicker'
import { ReportScreen } from './sec/ReportScreen'
import { TickerSearch } from './sec/TickerSearch'

/** Starting points for a first visit, across sectors; each is a listed, renderable filer. */
export const EXAMPLE_TICKERS = ['NVDA', 'AAPL', 'MSFT', 'JPM', 'KO'] as const

interface SecModeProps {
  /** The loaded report, owned by `App`. */
  report: NormalizedReport | null
  /** Called when a filing's report parses — with its queryable form for the chat. */
  onLoaded: (report: NormalizedReport, source: ReportSource, name: string) => void
  /** Clear the loaded report. */
  onReset: () => void
  /** Move to another lane, for the in-page links to File and MCP. */
  onNavigate: (lane: Lane) => void
}

export function SecMode({ report, onLoaded, onReset, onNavigate }: SecModeProps) {
  const [filer, setFiler] = useState<FilerRow | null>(null)
  const [filing, setFiling] = useState<CatalogFiling | null>(null)
  // The example ticker being looked up, and a lookup that failed.
  const [pendingTicker, setPendingTicker] = useState<string | null>(null)
  const [exampleError, setExampleError] = useState<string | null>(null)

  const changeFiling = useCallback(() => {
    setFiling(null)
    onReset()
  }, [onReset])

  const selectFiler = useCallback((f: FilerRow) => {
    setFiler(f)
    setFiling(null)
  }, [])

  // An example resolves through the same filer index the search uses, fetched once per tab.
  const openExample = useCallback(
    (ticker: string) => {
      setPendingTicker(ticker)
      setExampleError(null)
      loadFilerIndex()
        .then((rows) => {
          const row = rows.find((r) => r.ticker.toUpperCase() === ticker)
          if (row) selectFiler(row)
          else setExampleError(`${ticker} is not in the filer list.`)
        })
        .catch((e: unknown) =>
          setExampleError(
            `Could not load the filer list: ${e instanceof Error ? e.message : String(e)}`
          )
        )
        .finally(() => setPendingTicker(null))
    },
    [selectFiler]
  )

  const laneLink = (lane: Lane) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    onNavigate(lane)
  }

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
          <h1>Open any SEC filing</h1>
          <p className="hint">
            Every listed filer&apos;s 10-K, 10-Q, 20-F and 40-F since 2024, as{' '}
            <code>tavi.json</code> and <code>holon.jsonld</code> on the RoboSystems public data CDN.
            No key, no sign-up — search a company and open a filing.
          </p>
        </div>
      </div>

      <TickerSearch selected={filer} onSelect={selectFiler} />

      {filer ? (
        <ReportPicker filer={filer} onSelect={setFiling} />
      ) : (
        <div className="sec-empty">
          <p className="hint">Start typing a ticker or a company name, or try one:</p>
          <div className="sec-examples">
            {EXAMPLE_TICKERS.map((ticker) => (
              <button
                key={ticker}
                type="button"
                className="sec-example"
                disabled={pendingTicker !== null}
                aria-busy={pendingTicker === ticker}
                onClick={() => openExample(ticker)}
              >
                {ticker}
              </button>
            ))}
          </div>
          {exampleError ? <div className="error">{exampleError}</div> : null}

          <section className="sec-about">
            <p>
              xbrlkit reads XBRL financial reports in the browser. It rebuilds a filing&apos;s
              balance sheet, income statement, cash flow and every note from its structured data,
              shows the dimensional facts behind each number, and lets you query the report or ask
              an AI about it, with nothing installed.
            </p>
            <p>
              Holding a <code>holon.jsonld</code> or <code>tavi.json</code> of your own?{' '}
              <a href={pathForLane('file')} onClick={laneLink('file')}>
                Open it in File
              </a>
              . Would rather ask from Claude, Cursor or VS Code?{' '}
              <a href={pathForLane('mcp')} onClick={laneLink('mcp')}>
                Connect the MCP server
              </a>
              .
            </p>
          </section>
        </div>
      )}
    </div>
  )
}
