import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type CatalogFiling,
  FILER_INDEX_URL,
  FILINGS_CDN_URL,
  type FilerRow,
  fetchFiler,
  filerCatalogUrl,
  loadFilerIndex,
  periodOf,
  reportFileUrl,
  resetFilerIndex,
  searchFilers,
  tickerSlug,
} from '../src/sec/catalog'

// Fictional filers throughout.
function row(ticker: string, name: string, cik = ticker): FilerRow {
  return {
    ticker,
    cik,
    name,
    exchange: 'NYSE',
    sic_description: null,
    filings: 1,
    latest: {
      accession: `${cik}-26-000001`,
      form: '10-K',
      filing_date: '2026-02-20',
      report_date: '2025-12-31',
      fiscal_year: 2025,
      fiscal_period: 'FY',
    },
    renderable: true,
  }
}

const ROWS: FilerRow[] = [
  row('HVI', 'Halvorsen Instruments Corp'),
  row('HV', 'Hollow Valley Mining Ltd'),
  row('PLQ', 'Plinth Quarry Holdings'),
  row('ZEN', 'Zenith Halvorsen Logistics'),
  row('AHV', 'Ambling Hive Foods'),
]

const okResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response
const errResponse = (status: number) =>
  ({ ok: false, status, json: async () => ({}) }) as unknown as Response

describe('searchFilers', () => {
  it('puts an exact ticker first, then ticker prefixes in ticker order, then names', () => {
    expect(searchFilers(ROWS, 'hv').map((r) => r.ticker)).toEqual(['HV', 'HVI'])
    expect(searchFilers(ROWS, 'halvorsen').map((r) => r.ticker)).toEqual(['HVI', 'ZEN'])
  })

  it('is case-insensitive and ignores surrounding space', () => {
    expect(searchFilers(ROWS, '  Plinth ').map((r) => r.ticker)).toEqual(['PLQ'])
  })

  it('caps the result list', () => {
    expect(searchFilers(ROWS, 'h', 2)).toHaveLength(2)
  })

  it('is empty for an empty term', () => {
    expect(searchFilers(ROWS, '   ')).toEqual([])
  })
})

describe('tickerSlug and the catalog URL', () => {
  it('lower-cases a ticker and keeps the class separators EDGAR uses', () => {
    expect(tickerSlug(' BRK.B ')).toBe('brk.b')
    expect(tickerSlug('BF-B')).toBe('bf-b')
    expect(filerCatalogUrl('HVI')).toBe(`${FILINGS_CDN_URL}/companies/hvi.json`)
  })

  it('never builds a URL from a non-ticker', () => {
    for (const bad of ['', '../index', 'hvi/index', 'hv i', 'a'.repeat(11)]) {
      expect(tickerSlug(bad), bad).toBeNull()
      expect(filerCatalogUrl(bad), bad).toBeNull()
    }
  })
})

describe('reportFileUrl and periodOf', () => {
  const filing = (kinds: Array<'holon' | 'tavi' | 'document'>): CatalogFiling => ({
    accession: 'x',
    form: '10-Q',
    filing_date: '2026-08-04',
    report_date: '2026-06-30',
    fiscal_year: 2026,
    fiscal_period: 'Q2',
    representations: kinds.map((kind) => ({
      kind,
      name: `${kind}.json`,
      media_type: 'application/json',
      bytes: 1,
      url: `https://cdn.example/${kind}`,
    })),
  })

  it('prefers the Tavi model, falls back to the holon, and is null with neither', () => {
    expect(reportFileUrl(filing(['holon', 'tavi']))).toBe('https://cdn.example/tavi')
    expect(reportFileUrl(filing(['document', 'holon']))).toBe('https://cdn.example/holon')
    expect(reportFileUrl(filing(['document']))).toBeNull()
  })

  it('names the period from the fiscal fields, else the report date', () => {
    expect(periodOf(filing(['tavi']))).toBe('Q2 2026')
    expect(periodOf({ fiscal_period: null, fiscal_year: null, report_date: '2026-06-30' })).toBe(
      '2026-06-30'
    )
  })
})

describe('loadFilerIndex', () => {
  beforeEach(() => resetFilerIndex())
  afterEach(() => vi.unstubAllGlobals())

  it('fetches the index once and shares it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ companies: ROWS }))
    vi.stubGlobal('fetch', fetchMock)
    const [a, b] = await Promise.all([loadFilerIndex(), loadFilerIndex()])
    expect(a).toHaveLength(ROWS.length)
    expect(b).toBe(a)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(FILER_INDEX_URL)
  })

  it('does not cache a failure, so the next search retries', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errResponse(503))
      .mockResolvedValueOnce(okResponse({ companies: ROWS }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(loadFilerIndex()).rejects.toThrow('503')
    expect(await loadFilerIndex()).toHaveLength(ROWS.length)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('fetchFiler', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('is null when the CDN has no file, whether it says 404 or 403', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errResponse(403)))
    expect(await fetchFiler('HVI')).toBeNull()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errResponse(404)))
    expect(await fetchFiler('HVI')).toBeNull()
  })

  it('never fetches for a non-ticker', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await fetchFiler('../index')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
