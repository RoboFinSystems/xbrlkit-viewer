/**
 * The commands the CLI page shows. They mirror xbrlkit's own README ("Usage"
 * and "View & explore"), which is the source of truth — a change there is a
 * change here. `@latest` does what it does on the MCP page: without it uvx
 * keeps reusing the environment it built the first time. None of these needs
 * an extra; `serve` is the one command that does, and it lives on `/mcp`.
 */
export const CLI_USAGE = 'https://github.com/RoboFinSystems/xbrlkit#usage'

/** Open a filing in this viewer, installing nothing. */
export const VIEW_UVX = `uvx xbrlkit@latest view NVDA`

/** What `view` takes besides a ticker. */
export const VIEW_SOURCES = `xbrlkit view "NVDA 10-Q" --as tavi
xbrlkit view 320193:0000320193-23-000106
xbrlkit view lei:549300E9PC51EN656011
xbrlkit view ./report.zip
xbrlkit view NVDA --no-open`

/** Install it, so the commands are plain `xbrlkit`. */
export const INSTALL = `pip install xbrlkit`

/** Write a filing to disk, as a holon by default. */
export const WRITE_FILES = `xbrlkit fetch --ticker NVDA
xbrlkit fetch --ticker NVDA --form 10-Q --n 4 --format tavi
xbrlkit build --cik 320193 --accno 0000320193-23-000106 --format all`

/** Query a holon you wrote. */
export const QUERY_HOLON = `xbrlkit query --in output/0000320193-23-000106.holon.jsonld \\
  --element us-gaap:Assets --period-type instant`

/** Identify yourself to EDGAR. */
export const USER_AGENT = `export SEC_GOV_USER_AGENT="Your Name you@example.com"`
