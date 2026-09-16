import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from '../src/App'
import { EXAMPLE_TICKERS } from '../src/modes/SecMode'

const CDN = 'https://public.robosystems.ai/2025/0001045810/0001045810-25-000023/tavi.json'

/** Render the app as it first paints at an address. */
function renderAt(address: string): string {
  window.history.replaceState(null, '', address)
  return renderToStaticMarkup(<App />)
}

const SEC_SEARCH = 'Search by ticker or company name'
const FILE_DROPZONE = 'Open a holon.jsonld or tavi.json'
const MCP_HEADING = 'Read a filing in your own AI client'

describe('the lane an address opens', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('lands on the SEC lane, with example tickers and links to the other lanes', () => {
    const html = renderAt('/')
    expect(html).toContain(SEC_SEARCH)
    for (const ticker of EXAMPLE_TICKERS) expect(html).toContain(`>${ticker}</button>`)
    expect(html).toContain('href="/file"')
    expect(html).toContain('href="/mcp"')
    expect(html).not.toContain(FILE_DROPZONE)
    expect(html).toMatch(/role="tab" aria-selected="true">SEC</)
  })

  // The CLI and the SEC catalog write this link; it must open the report, not the search.
  it('opens a ?url= link on the apex in the File lane', () => {
    const html = renderAt(`/?url=${encodeURIComponent(CDN)}`)
    expect(html).toContain(FILE_DROPZONE)
    expect(html).not.toContain(SEC_SEARCH)
    expect(html).toMatch(/role="tab" aria-selected="true">File</)
  })

  it('opens a /view?url= link from xbrlkit view in the File lane', () => {
    const html = renderAt(`/view?url=${encodeURIComponent(CDN)}`)
    expect(html).toContain(FILE_DROPZONE)
    expect(html).not.toContain(SEC_SEARCH)
  })

  it('opens the File and MCP lanes at their own paths', () => {
    expect(renderAt('/file')).toContain(FILE_DROPZONE)
    expect(renderAt('/mcp')).toContain(MCP_HEADING)
  })

  it('orders the tabs SEC, File, MCP', () => {
    const tabs = [...renderAt('/').matchAll(/role="tab"[^>]*>([^<]+)</g)].map((m) => m[1])
    expect(tabs).toEqual(['SEC', 'File', 'MCP'])
  })
})
