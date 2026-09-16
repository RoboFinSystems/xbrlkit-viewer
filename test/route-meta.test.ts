import { describe, expect, it } from 'vitest'
import { LANES } from '../src/pages/route'
import {
  applyRouteMeta,
  beaconTag,
  canonicalUrl,
  CLONED_LANES,
  fillRouteHead,
  injectBeacon,
  renderRouteHead,
  ROUTE_META,
  routeFileName,
  swapRouteHead,
} from '../src/pages/routeMeta'

const SOURCE = `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <!--route-head-->
    <meta property="og:type" content="website" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`

function jsonLd(html: string): Record<string, unknown>[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1]) as Record<string, unknown>
  )
}

describe('route meta', () => {
  it('gives every lane its own title, description and canonical', () => {
    const titles = new Set(LANES.map((lane) => ROUTE_META[lane].title))
    const descriptions = new Set(LANES.map((lane) => ROUTE_META[lane].description))
    expect(titles.size).toBe(LANES.length)
    expect(descriptions.size).toBe(LANES.length)
    expect(canonicalUrl('sec')).toBe('https://xbrlkit.com/')
    expect(canonicalUrl('file')).toBe('https://xbrlkit.com/file')
    expect(canonicalUrl('mcp')).toBe('https://xbrlkit.com/mcp')
  })

  it('writes the canonical into both the link and og:url', () => {
    for (const lane of LANES) {
      const head = renderRouteHead(lane)
      expect(head).toContain(`<link rel="canonical" href="${canonicalUrl(lane)}" />`)
      expect(head).toContain(`<meta property="og:url" content="${canonicalUrl(lane)}" />`)
    }
  })

  it('carries structured data on the apex only', () => {
    const [app] = jsonLd(renderRouteHead('sec'))
    expect(app['@type']).toBe('WebApplication')
    expect(app.url).toBe('https://xbrlkit.com/')
    expect(app.isAccessibleForFree).toBe(true)
    expect(jsonLd(renderRouteHead('file'))).toHaveLength(0)
    expect(jsonLd(renderRouteHead('mcp'))).toHaveLength(0)
  })

  it('names where each lane is written', () => {
    expect(routeFileName('sec')).toBe('index.html')
    expect(routeFileName('file')).toBe('file/index.html')
    expect(routeFileName('mcp')).toBe('mcp/index.html')
    expect(CLONED_LANES).toEqual(['file', 'mcp'])
  })
})

describe('building the lane pages', () => {
  it('fills the marker with the apex head', () => {
    const html = fillRouteHead(SOURCE)
    expect(html).not.toContain('<!--route-head-->')
    expect(html).toContain(`<title>${ROUTE_META.sec.title}</title>`)
  })

  it('swaps only the head block for another lane', () => {
    const apex = fillRouteHead(SOURCE)
    const mcp = swapRouteHead(apex, 'mcp')
    expect(mcp).toContain(`<title>${ROUTE_META.mcp.title}</title>`)
    expect(mcp).not.toContain(ROUTE_META.sec.title)
    expect(mcp.replace(renderRouteHead('mcp'), '')).toBe(apex.replace(renderRouteHead('sec'), ''))
  })

  it('refuses a page without the marker or the block', () => {
    expect(() => fillRouteHead('<html></html>')).toThrow()
    expect(() => swapRouteHead(SOURCE, 'file')).toThrow()
  })
})

describe('the analytics beacon', () => {
  it('is absent without a token', () => {
    expect(beaconTag(undefined)).toBeNull()
    expect(beaconTag('  ')).toBeNull()
    expect(injectBeacon(SOURCE, '')).toBe(SOURCE)
  })

  it('is a classic deferred script carrying the token', () => {
    const tag = beaconTag('0123abcd')
    expect(tag).toBe(
      `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"0123abcd"}'></script>`
    )
    expect(tag).not.toContain('type="module"')
    expect(injectBeacon(SOURCE, '0123abcd')).toMatch(/beacon\.min\.js[^\n]*<\/script>\n\s*<\/body>/)
  })

  it('fails the build on a token that could break the markup', () => {
    expect(() => beaconTag(`abc'"><script>`)).toThrow()
  })
})

describe('applyRouteMeta', () => {
  it('brings the live head in step with the lane', () => {
    document.head.innerHTML = renderRouteHead('sec')
    applyRouteMeta('file')
    expect(document.title).toBe(ROUTE_META.file.title)
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      canonicalUrl('file')
    )
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      ROUTE_META.file.description
    )
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      ROUTE_META.file.title
    )
  })
})
