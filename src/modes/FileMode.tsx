import type { NormalizedReport } from '@robosystems/report-components'
import { reportSections, sliceReportSection } from '@robosystems/report-components'
import type { DragEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReportSource } from '../ai/source'
import { Spinner } from '../components/Spinner'
import { loadDocumentText } from '../report/loadDocument'
import { SectionedReport } from '../report/SectionedReport'
import { holonUrlName, holonUrlParam } from './openUrl'

const SAMPLE_URL = '/samples/0001045810-26-000021.holon.jsonld'

interface FileModeProps {
  /** The loaded report, owned by `App` (so the header can show it). */
  report: NormalizedReport | null
  /** File name of the loaded report — keys the section view so it resets per file. */
  fileName: string | null
  /** Called when a report parses — with the file's queryable form (RDF store or Tavi document) for the chat. */
  onLoaded: (report: NormalizedReport, source: ReportSource, fileName: string) => void
  /** Clear the loaded report and return to the dropzone. */
  onReset: () => void
}

/**
 * Mode A — offline, zero-auth. Drop (or pick) a report's `holon.jsonld` or
 * `tavi.json`; the library sniffs which it is, parses it client-side and the
 * shared components render it. No network, no key, no backend. The loaded-file chip + "Load another" live in
 * the app header (`App` owns that state); this renders the dropzone, then the
 * report once one is loaded.
 */
export function FileMode({ report, fileName, onLoaded, onReset }: FileModeProps) {
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  // The URL being fetched for a `?url=` open, while it is in flight.
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null)
  const openedFromUrl = useRef(false)

  // A holon is fully in memory, so a section loads instantly — slice it out of
  // the parsed report. Same shared surface the SEC mode uses.
  const sections = useMemo(() => (report ? reportSections(report) : []), [report])
  const loadSection = useCallback(
    (id: string): Promise<NormalizedReport> =>
      report
        ? Promise.resolve(sliceReportSection(report, id))
        : Promise.reject(new Error('No report loaded')),
    [report]
  )

  // Clear any error whenever the loaded report changes — in particular when
  // "Load another" (App's onReset) sets report back to null — so a stale
  // message from a superseded/failed load can't surface on the empty dropzone.
  // A failed load leaves report unchanged (null → null), so its error persists.
  useEffect(() => {
    setError(null)
  }, [report])

  const loadText = useCallback(
    async (text: string, name: string) => {
      try {
        const { report: parsed, source } = await loadDocumentText(text)
        onLoaded(parsed, source, name)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    [onLoaded]
  )

  // Open the holon named in the page URL (`?url=`) once, on first mount: the
  // link the company pages and the catalog write. Guarded by a ref so a later
  // "Load another" does not reopen it.
  useEffect(() => {
    if (openedFromUrl.current) return
    const url = holonUrlParam(window.location.search)
    if (!url) return
    openedFromUrl.current = true
    setLoadingUrl(url)
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then((text) => loadText(text, holonUrlName(url)))
      .catch((e) =>
        setError(`Could not load ${url}: ${e instanceof Error ? e.message : String(e)}`)
      )
      .finally(() => setLoadingUrl(null))
  }, [loadText])

  const onFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (!file) return
      file
        .text()
        .then((text) => loadText(text, file.name))
        .catch((e) => setError(String(e)))
    },
    [loadText]
  )

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      onFiles(e.dataTransfer.files)
    },
    [onFiles]
  )

  const loadSample = useCallback(() => {
    fetch(SAMPLE_URL)
      .then((r) => r.text())
      .then((text) => loadText(text, '0001045810-26-000021.holon.jsonld'))
      .catch((e) => setError(`Could not load sample: ${e}`))
  }, [loadText])

  if (report) {
    const header = (
      <div className="report-breadcrumb">
        <button type="button" className="btn btn-secondary btn-sm" onClick={onReset}>
          ← Load another
        </button>
        <span className="report-breadcrumb-title">
          <strong>{report.entity?.name ?? fileName ?? 'Report'}</strong>
          {fileName ? <span className="hint"> · {fileName}</span> : null}
        </span>
      </div>
    )
    return (
      <SectionedReport
        key={fileName ?? 'file'}
        sections={sections}
        loadSection={loadSection}
        header={header}
      />
    )
  }

  if (loadingUrl) {
    return (
      <div className="loading-center">
        <Spinner label={`Loading ${loadingUrl}…`} />
      </div>
    )
  }

  return (
    <div>
      <div
        className={dragging ? 'dropzone dragging' : 'dropzone'}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <h2>Open a holon.jsonld or tavi.json</h2>
        <p>
          Drag &amp; drop a report&apos;s <code>holon.jsonld</code> or <code>tavi.json</code> here,
          or choose a file. Everything runs in your browser.
        </p>
        <div
          style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <label className="file-input-label btn">
            Choose file
            <input
              type="file"
              accept=".jsonld,.json,application/ld+json,application/json"
              onChange={(e) => onFiles(e.target.files)}
            />
          </label>
          <button type="button" className="btn btn-secondary" onClick={loadSample}>
            Load sample (NVIDIA 10-K)
          </button>
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}
    </div>
  )
}
