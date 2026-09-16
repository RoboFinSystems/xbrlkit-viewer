import type { NormalizedReport } from '@robosystems/report-components'
import { reportSections, sliceReportSection } from '@robosystems/report-components'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReportSource } from '../../ai/source'
import { ResearchIcon } from '../../components/icons'
import { Spinner } from '../../components/Spinner'
import { loadDocumentUrl } from '../../report/loadDocument'
import { SectionedReport } from '../../report/SectionedReport'
import { type CatalogFiling, type FilerRow, periodOf, reportFileUrl } from '../../sec/catalog'
import { hasResearchCoverage, researchUrl } from '../../sec/research'

interface ReportScreenProps {
  filer: FilerRow
  filing: CatalogFiling
  /** The loaded report, owned by `App`. */
  report: NormalizedReport | null
  onLoaded: (report: NormalizedReport, source: ReportSource, name: string) => void
  /** Back to company / filing selection. */
  onBack: () => void
}

/**
 * Open the chosen filing from the CDN — its Tavi model when it has one, else
 * its holon — hand it to `App`, and render it through the shared
 * `SectionedReport`. Every section is in memory once the file is parsed, so a
 * section loads instantly.
 */
export function ReportScreen({ filer, filing, report, onLoaded, onBack }: ReportScreenProps) {
  const url = reportFileUrl(filing)
  const name = `${filer.ticker} ${filing.form} ${periodOf(filing)}`.trim()
  // The URL whose report `App` now holds — until it matches, what `App` holds
  // is an earlier report and must not show under this filing's header.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Every listed filer has a page on roboinvestor.ai; the label says whether
  // hand-made research leads it.
  const [pageLabel, setPageLabel] = useState('Company page')

  useEffect(() => {
    if (!url) {
      setError('This filing has no Tavi model or holon yet.')
      return
    }
    let cancelled = false
    setError(null)
    setLoadedUrl(null)
    loadDocumentUrl(url)
      .then(({ report: parsed, source }) => {
        if (cancelled) return
        onLoaded(parsed, source, name)
        setLoadedUrl(url)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(`Could not load ${url}: ${e instanceof Error ? e.message : String(e)}`)
      })
    return () => {
      cancelled = true
    }
  }, [url, name, onLoaded])

  useEffect(() => {
    let cancelled = false
    setPageLabel('Company page')
    void hasResearchCoverage(filer.ticker).then((covered) => {
      if (!cancelled && covered) setPageLabel('Research')
    })
    return () => {
      cancelled = true
    }
  }, [filer.ticker])

  const ready = report !== null && loadedUrl === url
  const sections = useMemo(() => (ready && report ? reportSections(report) : []), [ready, report])
  const loadSection = useCallback(
    (id: string): Promise<NormalizedReport> =>
      report
        ? Promise.resolve(sliceReportSection(report, id))
        : Promise.reject(new Error('No report loaded')),
    [report]
  )

  const period = periodOf(filing)
  const header = (
    <div className="report-breadcrumb">
      <button type="button" className="btn btn-secondary btn-sm" onClick={onBack}>
        ← Change filing
      </button>
      <span className="report-breadcrumb-title">
        <strong>{filer.name}</strong>
        <span className="hint"> · {filer.ticker}</span>
        <span className="hint"> · {filing.form}</span>
        {period ? <span className="hint"> · {period}</span> : null}
      </span>
      <a
        className="research-link"
        href={researchUrl(filer.ticker)}
        target="_blank"
        rel="noreferrer noopener"
        title={`${pageLabel} for ${filer.ticker} on roboinvestor.ai`}
      >
        <ResearchIcon className="research-link-icon" />
        {pageLabel}
        <span aria-hidden="true"> ↗</span>
      </a>
    </div>
  )

  if (error) {
    return (
      <div className="sectioned-report">
        {header}
        <div className="error">{error}</div>
      </div>
    )
  }
  if (!ready) {
    return (
      <div className="sectioned-report">
        {header}
        <div className="loading-center">
          <Spinner label={`Loading the ${filing.form}…`} />
        </div>
      </div>
    )
  }
  return (
    <SectionedReport
      key={filing.accession}
      sections={sections}
      loadSection={loadSection}
      header={header}
    />
  )
}
