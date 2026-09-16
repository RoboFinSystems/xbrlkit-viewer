import { holonUrlParam } from '../modes/openUrl'

/**
 * The site has three lanes. `/` is the SEC lane: search a listed filer and
 * open a filing, no file and no key needed, so it is what the address opens
 * on. `/file` opens a `holon.jsonld` or `tavi.json` the visitor holds, and
 * `/mcp` is the page on connecting an MCP client to `xbrlkit serve`.
 *
 * `/?url=…` belongs to no lane's path and must keep working on the apex
 * forever: `xbrlkit view` and the SEC catalog both write that link, and the
 * CLI names this origin in its CORS header. A `?url=` on `/` therefore opens
 * the File lane, which loads the linked report.
 *
 * CloudFront rewrites `/file` and `/mcp` to their own `index.html` (so each
 * carries its own meta) and answers every other path with the apex page, so
 * the lane is resolved here from the location, with no router. Keep the
 * paths in step with the edge function in `cloudformation/template.yaml`.
 */
export type Lane = 'sec' | 'file' | 'mcp'

export const LANES: readonly Lane[] = ['sec', 'file', 'mcp']

export const LANE_PATHS: Record<Lane, string> = {
  sec: '/',
  file: '/file',
  mcp: '/mcp',
}

/**
 * The link `xbrlkit view` and its MCP `view_filing` tool open: `/view?url=…`.
 * It is the apex page under a second name. With a `?url=` it shows the File
 * lane, and its head is the apex's, so the canonical stays `/`. The separate
 * path exists so page-view analytics, which record the path and drop the query
 * string, can count opens from xbrlkit apart from report links on the web.
 * Like `/?url=`, it must keep working for as long as those releases are
 * installed.
 */
export const VIEW_PATH = '/view'

/**
 * The lane a path names, ignoring the query: the page CloudFront serves for it,
 * and so the head the address should carry. A trailing slash or `/index.html`
 * is the same page.
 */
export function laneFromPath(pathname: string): Lane {
  const path = pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '')
  if (path === LANE_PATHS.mcp) return 'mcp'
  if (path === LANE_PATHS.file) return 'file'
  // `/view` is the apex page under another name (see VIEW_PATH), like any other path.
  return 'sec'
}

/** The lane a location shows: its path's lane, except that the apex with a `?url=` shows File. */
export function laneFromLocation(pathname: string, search: string): Lane {
  const lane = laneFromPath(pathname)
  return lane === 'sec' && holonUrlParam(search) ? 'file' : lane
}

/** The address to put in the location bar for a lane. */
export function pathForLane(lane: Lane): string {
  return LANE_PATHS[lane]
}
