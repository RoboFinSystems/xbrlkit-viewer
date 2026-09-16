/**
 * Each lane's own `<head>`: title, description, canonical, the Open Graph and
 * Twitter text, and on the apex the site's structured data.
 *
 * The build writes the blocks into static HTML (`vite.config.ts`): the apex
 * `index.html` gets the SEC block in place of the `<!--route-head-->` marker,
 * and `file/index.html` and `mcp/index.html` are the same page with their own
 * block swapped in, so a crawler or a link preview reads the right meta
 * without running JavaScript. `applyRouteMeta` keeps the head in step when the
 * visitor moves between lanes in the browser.
 *
 * Everything here is pure string work, apart from `applyRouteMeta`, so the
 * Vite config can import it.
 */
import { XBRLKIT_PYPI, XBRLKIT_REPO } from './mcpRecipes'
import { LANE_PATHS, LANES, type Lane } from './route'

/** The canonical origin. The `holon.robosystems.ai` alias canonicalizes here. */
export const SITE_URL = 'https://xbrlkit.com'
export const VIEWER_REPO = 'https://github.com/RoboFinSystems/xbrlkit-viewer'

interface RouteMeta {
  title: string
  description: string
}

export const ROUTE_META: Record<Lane, RouteMeta> = {
  sec: {
    title: 'xbrlkit — open any SEC filing in the browser',
    description:
      'Search any listed company and open its 10-K, 10-Q, 20-F or 40-F since 2024 in the browser: financial statements, notes, dimensional XBRL facts, in-browser query and AI analysis. No key, no sign-up.',
  },
  file: {
    title: 'Open a holon.jsonld or tavi.json financial report — xbrlkit',
    description:
      'Open a holon.jsonld or tavi.json XBRL financial report in the browser: statements, notes, dimensional facts, in-browser SPARQL or jq query and AI analysis. The file never leaves your machine.',
  },
  mcp: {
    title: 'xbrlkit MCP server — read a filing in Claude, Cursor or VS Code, locally',
    description:
      'Connect Claude, Cursor, VS Code or Claude Code to xbrlkit serve, the local MCP server that reads an XBRL filing on your machine. Nothing hosted: no account, no key.',
  },
}

const START = '<!--route-head:start-->'
const END = '<!--route-head:end-->'
const MARKER = '<!--route-head-->'
const BLOCK = /<!--route-head:start-->[\s\S]*?<!--route-head:end-->/

/** The lane's absolute canonical URL. */
export function canonicalUrl(lane: Lane): string {
  return lane === 'sec' ? `${SITE_URL}/` : `${SITE_URL}${LANE_PATHS[lane]}`
}

/** Where the build writes the lane's HTML: `index.html`, `file/index.html`, `mcp/index.html`. */
export function routeFileName(lane: Lane): string {
  return lane === 'sec' ? 'index.html' : `${LANE_PATHS[lane].slice(1)}/index.html`
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** The site as a `WebApplication`, for the apex only. */
export function structuredData(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'xbrlkit',
    url: canonicalUrl('sec'),
    description: ROUTE_META.sec.description,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    license: 'https://opensource.org/licenses/MIT',
    sameAs: [VIEWER_REPO, XBRLKIT_REPO, XBRLKIT_PYPI],
    publisher: { '@type': 'Organization', name: 'RoboSystems', url: 'https://robosystems.ai' },
  }
}

/** The lane's head block, delimited so the build can swap it per route. */
export function renderRouteHead(lane: Lane): string {
  const { title, description } = ROUTE_META[lane]
  const url = canonicalUrl(lane)
  const lines = [
    START,
    `<title>${escapeText(title)}</title>`,
    `<meta name="description" content="${escapeAttr(description)}" />`,
    `<link rel="canonical" href="${escapeAttr(url)}" />`,
    `<meta property="og:url" content="${escapeAttr(url)}" />`,
    `<meta property="og:title" content="${escapeAttr(title)}" />`,
    `<meta property="og:description" content="${escapeAttr(description)}" />`,
    `<meta name="twitter:title" content="${escapeAttr(title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(description)}" />`,
  ]
  if (lane === 'sec') {
    // `<` escaped so no string in the data can close the script element.
    const json = JSON.stringify(structuredData()).replace(/</g, '\\u003c')
    lines.push(`<script type="application/ld+json">${json}</script>`)
  }
  lines.push(END)
  return lines.join('\n    ')
}

/** Fill the source `index.html`'s marker with the apex (SEC) block. */
export function fillRouteHead(html: string): string {
  if (!html.includes(MARKER)) throw new Error(`index.html has no ${MARKER} marker`)
  return html.replace(MARKER, renderRouteHead('sec'))
}

/** The same page with another lane's block in place of the one it carries. */
export function swapRouteHead(html: string, lane: Lane): string {
  if (!BLOCK.test(html)) throw new Error('index.html has no route-head block to swap')
  return html.replace(BLOCK, () => renderRouteHead(lane))
}

const BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js'

/**
 * The Cloudflare Web Analytics beacon, or null when no token is set (local and
 * fork builds emit nothing). A classic deferred script, as Cloudflare
 * documents it: `type="module"` would fetch it in CORS mode for no gain.
 * Cookieless; it sees page views and referrers, never a report or a key.
 */
export function beaconTag(token: string | undefined): string | null {
  const value = token?.trim() ?? ''
  if (!value) return null
  if (!/^[A-Za-z0-9]+$/.test(value)) {
    throw new Error('VITE_CF_ANALYTICS_TOKEN is not a Cloudflare Web Analytics token')
  }
  return `<script defer src="${BEACON_SRC}" data-cf-beacon='{"token":"${value}"}'></script>`
}

/** Append the beacon before `</body>` when a token is set. */
export function injectBeacon(html: string, token: string | undefined): string {
  const tag = beaconTag(token)
  if (!tag) return html
  if (!html.includes('</body>')) throw new Error('index.html has no </body>')
  return html.replace('</body>', `  ${tag}\n  </body>`)
}

/** Every lane but the apex, which the build clones from `index.html`. */
export const CLONED_LANES: readonly Lane[] = LANES.filter((lane) => lane !== 'sec')

function setContent(doc: Document, selector: string, value: string, attr = 'content'): void {
  doc.querySelector(selector)?.setAttribute(attr, value)
}

/** Bring the live head in step with the lane after an in-browser move. */
export function applyRouteMeta(lane: Lane, doc: Document = document): void {
  const { title, description } = ROUTE_META[lane]
  const url = canonicalUrl(lane)
  doc.title = title
  setContent(doc, 'meta[name="description"]', description)
  setContent(doc, 'link[rel="canonical"]', url, 'href')
  setContent(doc, 'meta[property="og:url"]', url)
  setContent(doc, 'meta[property="og:title"]', title)
  setContent(doc, 'meta[property="og:description"]', description)
  setContent(doc, 'meta[name="twitter:title"]', title)
  setContent(doc, 'meta[name="twitter:description"]', description)
}
