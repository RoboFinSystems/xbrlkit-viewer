/**
 * The filer catalog on the RoboSystems public data CDN — the same files the
 * roboinvestor company pages are built from, read here with no key and no
 * backend. `companies/index.json` lists every listed filer (ticker, name, CIK,
 * exchange, industry, latest filing); `companies/{ticker}.json` lists one
 * filer's filings with the public representations each has — the holon and
 * the Tavi model this viewer opens by URL.
 *
 * The index is one fetch per tab, taken on the first search rather than at
 * startup, and searched in memory: a ticker prefix or a name substring.
 */

const viteEnv = (import.meta as { env?: Record<string, string | undefined> }).env

/** The public data CDN (trailing slash trimmed). */
export const FILINGS_CDN_URL = (
  viteEnv?.VITE_FILINGS_CDN_URL ?? 'https://public.robosystems.ai'
).replace(/\/+$/, '')

export interface FilerRow {
  ticker: string
  cik: string
  name: string
  exchange: string | null
  sic_description: string | null
  filings: number
  latest: {
    accession: string
    form: string
    filing_date: string | null
    report_date: string | null
    fiscal_year: number | null
    fiscal_period: string | null
  }
  renderable: boolean
}

export interface Representation {
  kind: 'holon' | 'tavi' | 'document'
  name: string
  media_type: string
  bytes: number
  url: string
}

export interface CatalogFiling {
  accession: string
  form: string
  filing_date: string | null
  report_date: string | null
  fiscal_year: number | null
  fiscal_period: string | null
  representations: Representation[]
}

export interface FilerCatalog {
  cik: string
  ticker: string
  name: string
  exchange: string | null
  sic_description: string | null
  /** Newest first. */
  filings: CatalogFiling[]
}

/**
 * What a ticker looks like on EDGAR: letters, digits and the `.` / `-` class
 * separators, at most ten characters. The catalog file name is built from it,
 * so anything else never becomes a URL.
 */
const TICKER = /^[A-Z0-9.-]{1,10}$/i

export function tickerSlug(ticker: string): string | null {
  const slug = ticker.trim().toLowerCase()
  return TICKER.test(slug) ? slug : null
}

export const FILER_INDEX_URL = `${FILINGS_CDN_URL}/companies/index.json`

export function filerCatalogUrl(ticker: string): string | null {
  const slug = tickerSlug(ticker)
  return slug ? `${FILINGS_CDN_URL}/companies/${slug}.json` : null
}

let indexPromise: Promise<FilerRow[]> | null = null

/** Every listed filer, fetched once per tab. A failed fetch is not cached, so the next search retries. */
export function loadFilerIndex(): Promise<FilerRow[]> {
  if (indexPromise) return indexPromise
  indexPromise = fetch(FILER_INDEX_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Filer index fetch failed: ${res.status}`)
      return res.json() as Promise<{ companies?: FilerRow[] }>
    })
    .then((body) => body.companies ?? [])
    .catch((e: unknown) => {
      indexPromise = null
      throw e
    })
  return indexPromise
}

/** Forget the cached index (tests). */
export function resetFilerIndex(): void {
  indexPromise = null
}

/**
 * Filers matching a term: ticker matches first (exact, then prefix, in ticker
 * order), then name matches in name order. Case-insensitive; capped so the
 * dropdown stays small.
 */
export function searchFilers(rows: FilerRow[], term: string, limit = 20): FilerRow[] {
  const q = term.trim()
  if (!q) return []
  const upper = q.toUpperCase()
  const lower = q.toLowerCase()
  const exact: FilerRow[] = []
  const prefix: FilerRow[] = []
  const byName: FilerRow[] = []
  for (const row of rows) {
    const ticker = row.ticker.toUpperCase()
    if (ticker === upper) exact.push(row)
    else if (ticker.startsWith(upper)) prefix.push(row)
    else if (row.name.toLowerCase().includes(lower)) byName.push(row)
  }
  prefix.sort((a, b) => a.ticker.localeCompare(b.ticker))
  byName.sort((a, b) => a.name.localeCompare(b.name))
  return [...exact, ...prefix, ...byName].slice(0, limit)
}

/** One filer's catalog, or null when the CDN has no file for the ticker. */
export async function fetchFiler(ticker: string): Promise<FilerCatalog | null> {
  const url = filerCatalogUrl(ticker)
  if (!url) return null
  const res = await fetch(url)
  // The CDN answers a missing object with 403 (no list permission), not 404.
  if (res.status === 404 || res.status === 403) return null
  if (!res.ok) throw new Error(`Filer catalog fetch failed: ${res.status}`)
  return (await res.json()) as FilerCatalog
}

/**
 * The file to open for a filing: the Tavi model when it has one (parsed
 * directly, tens of milliseconds), else the holon. Null when the filing's
 * artifacts are not written yet.
 */
export function reportFileUrl(filing: CatalogFiling): string | null {
  const reps = filing.representations ?? []
  return (
    reps.find((r) => r.kind === 'tavi')?.url ?? reps.find((r) => r.kind === 'holon')?.url ?? null
  )
}

/** `FY 2025`, `Q2 2026`, or the report date when the fiscal fields are missing. */
export function periodOf(
  filing: Pick<CatalogFiling, 'fiscal_period' | 'fiscal_year' | 'report_date'>
): string {
  if (filing.fiscal_period && filing.fiscal_year)
    return `${filing.fiscal_period} ${filing.fiscal_year}`
  return filing.report_date ?? ''
}
