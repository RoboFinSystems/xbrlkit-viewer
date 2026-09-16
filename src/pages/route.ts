/**
 * The viewer has two addresses. `/` is the viewer itself — File and SEC modes,
 * and the `?url=` opens the catalog and `xbrlkit view` write — and `/mcp` is
 * the page on connecting an MCP client to `xbrlkit serve`. CloudFront answers
 * every path with `index.html`, so the split is resolved here from the
 * pathname, with no router: one page is not worth a dependency.
 */
export type Page = 'viewer' | 'mcp'

export const MCP_PATH = '/mcp'

/** Which page a pathname names; a trailing slash is the same page. */
export function pageFromPath(pathname: string): Page {
  return pathname.replace(/\/+$/, '') === MCP_PATH ? 'mcp' : 'viewer'
}

/** The address to put in the location bar for a page. */
export function pathForPage(page: Page): string {
  return page === 'mcp' ? MCP_PATH : '/'
}
