import type { MouseEvent } from 'react'
import { CodeBlock } from '../components/CodeBlock'
import {
  CLI_USAGE,
  INSTALL,
  QUERY_HOLON,
  USER_AGENT,
  VIEW_SOURCES,
  VIEW_UVX,
  WRITE_FILES,
} from './cliRecipes'
import { UV_INSTALL, XBRLKIT_PYPI, XBRLKIT_REPO } from './mcpRecipes'
import { pathForLane, type Lane } from './route'

/**
 * `/cli` — the xbrlkit command line, the advanced use behind the MCP page.
 * `/mcp` is the way in and this page says so first; what follows is what only
 * the CLI does — the filing as files — then `view`. Like `/mcp` it is the
 * recipe and nothing more, with the full list linked in the README. `serve`
 * is left to `/mcp`, which is its page.
 */
export function CliPage({ onNavigate }: { onNavigate: (lane: Lane) => void }) {
  const laneLink = (lane: Lane) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    onNavigate(lane)
  }

  return (
    <article className="local-page">
      <header>
        <h1>Read a filing from your terminal</h1>
        <p>
          To ask a filing questions in Claude, Cursor or any other AI client, start with{' '}
          <a href={pathForLane('mcp')} onClick={laneLink('mcp')}>
            the MCP server
          </a>
          . The command line is the advanced use: the filing as files, for scripts, pipelines and
          your own tools. It resolves a filing by ticker, accession, LEI or path, parses it on your
          machine, and writes it as a <code>holon.jsonld</code>, a <code>tavi.json</code> or a
          graph. Nothing is hosted: no account, no key.
        </p>
      </header>

      <section>
        <h3>Install it</h3>
        <p>
          Or run any command below without installing, as <code>uvx xbrlkit@latest …</code>, with{' '}
          <a href={UV_INSTALL} target="_blank" rel="noreferrer noopener">
            uv
          </a>
          .
        </p>
        <CodeBlock label="Terminal" code={INSTALL} />
      </section>

      <section>
        <h3>Write a filing to disk</h3>
        <p>
          <code>fetch</code> takes a ticker, <code>build</code> one accession. Both write to{' '}
          <code>./output</code>, a holon unless <code>--format</code> asks for <code>tavi</code>,{' '}
          <code>oim</code> (xBRL-JSON) or <code>all</code> of them. <code>lpg</code>, a LadybugDB
          graph, needs the <code>[lpg]</code> extra.
        </p>
        <CodeBlock label="Terminal" code={WRITE_FILES} />
        <CodeBlock label="Query a holon" code={QUERY_HOLON} />
      </section>

      <section>
        <h3>Open a filing in the viewer</h3>
        <p>
          <code>view</code> serves the filing on loopback and opens it on this site until you press
          Ctrl-C; the file never leaves your machine.
        </p>
        <CodeBlock label="Terminal" code={VIEW_UVX} />
        <p>
          A form, an EDGAR <code>cik:accession</code>, an <code>lei:</code> for a filing on
          filings.xbrl.org, or a filing package you already have:
        </p>
        <CodeBlock label="Terminal" code={VIEW_SOURCES} />
      </section>

      <section>
        <h3>Say who you are to EDGAR</h3>
        <p>
          Optional. EDGAR asks callers to identify themselves; without it xbrlkit uses a shared
          default and says so once. A local file and filings.xbrl.org need none.
        </p>
        <CodeBlock label="Terminal" code={USER_AGENT} />
      </section>

      <footer className="local-foot">
        <p>
          Every command and switch is in the{' '}
          <a href={CLI_USAGE} target="_blank" rel="noreferrer noopener">
            README
          </a>{' '}
          and <code>xbrlkit --help</code>. The same package is{' '}
          <a href={pathForLane('python')} onClick={laneLink('python')}>
            a Python library
          </a>
          . It is on{' '}
          <a href={XBRLKIT_REPO} target="_blank" rel="noreferrer noopener">
            GitHub
          </a>{' '}
          and{' '}
          <a href={XBRLKIT_PYPI} target="_blank" rel="noreferrer noopener">
            PyPI
          </a>
          , MIT.
        </p>
      </footer>
    </article>
  )
}
