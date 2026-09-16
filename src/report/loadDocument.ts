/**
 * From a report document's text to what the app holds for it: the parsed
 * `NormalizedReport` the renderer walks, and the document's own queryable form
 * for the chat. Shared by every way a report arrives — a dropped file, a
 * `?url=` link, a filing picked from the SEC catalog.
 */
import type { NormalizedReport } from '@robosystems/report-components'
import { parseReportDocument, type TaviDocument } from '@robosystems/report-components/adapters'
import { buildStore } from '../ai/rdf'
import type { ReportSource } from '../ai/source'

export interface LoadedDocument {
  report: NormalizedReport
  source: ReportSource
}

/**
 * Parse a holon or a Tavi model. Throws when the text is not JSON or the
 * document has no sections to render.
 *
 * A holon is RDF: the store is rebuilt from the same document so the chat can
 * run SPARQL over it (report-components discards its own). A Tavi model is one
 * JSON document: the chat runs jq over it as-is.
 */
export async function loadDocumentText(text: string): Promise<LoadedDocument> {
  const json = JSON.parse(text) as object
  const { format, report } = await parseReportDocument(json)
  if (!report.informationBlocks.length) {
    throw new Error('No sections found — is this a holon or a Tavi report?')
  }
  const source: ReportSource =
    format === 'holon'
      ? { format, store: await buildStore(json) }
      : { format, doc: json as TaviDocument, text }
  return { report, source }
}

/** Fetch a report file and load it. The host has to allow cross-origin reads. */
export async function loadDocumentUrl(url: string): Promise<LoadedDocument> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return loadDocumentText(await res.text())
}
