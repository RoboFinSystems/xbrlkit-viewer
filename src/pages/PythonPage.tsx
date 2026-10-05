import type { MouseEvent } from 'react'
import { CodeBlock } from '../components/CodeBlock'
import { CLI_USAGE } from './cliRecipes'
import { XBRLKIT_PYPI, XBRLKIT_REPO } from './mcpRecipes'
import { PY_INSTALL, PY_LOAD, PY_QUERY, PY_SERIALIZE } from './pythonRecipes'
import { pathForLane, type Lane } from './route'

/**
 * `/python` — xbrlkit as a library, the third of the local pages after `/mcp`
 * and `/cli`, and the one a search for a Python XBRL library lands on. It
 * points up to those two first, then shows the three calls that cover most
 * use, with the rest linked in the README.
 */
export function PythonPage({ onNavigate }: { onNavigate: (lane: Lane) => void }) {
  const laneLink = (lane: Lane) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    onNavigate(lane)
  }

  return (
    <article className="local-page">
      <header>
        <h1>Read a filing in Python</h1>
        <p>
          xbrlkit is a Python library on PyPI. It parses an XBRL filing once, an SEC 10-K or 10-Q,
          an ESEF annual report or a filing package you hold, into one model you can read in code or
          write out as a <code>holon.jsonld</code>, a <code>tavi.json</code>, xBRL-JSON or a
          property graph. It runs on your machine: no account, no key.
        </p>
        <p>
          To ask a filing questions in an AI client, start with{' '}
          <a href={pathForLane('mcp')} onClick={laneLink('mcp')}>
            the MCP server
          </a>
          ; for files from a terminal,{' '}
          <a href={pathForLane('cli')} onClick={laneLink('cli')}>
            the command line
          </a>
          .
        </p>
      </header>

      <section>
        <h3>Install it</h3>
        <CodeBlock label="Terminal" code={PY_INSTALL} />
      </section>

      <section>
        <h3>Load a filing</h3>
        <p>
          A session resolves a filing the way the command line does: a ticker with an optional form,
          an EDGAR <code>cik:accession</code>, an <code>lei:</code> for a filing on
          filings.xbrl.org, or a local path.
        </p>
        <CodeBlock label="Python" code={PY_LOAD} />
      </section>

      <section>
        <h3>Write it out</h3>
        <CodeBlock label="Python" code={PY_SERIALIZE} />
      </section>

      <section>
        <h3>Query a holon</h3>
        <p>Consolidated facts by concept, period and period type, read in memory.</p>
        <CodeBlock label="Python" code={PY_QUERY} />
      </section>

      <footer className="local-foot">
        <p>
          The rest of the library, including the Arelle-level <code>load_model</code> for a host
          with its own controller, is in the{' '}
          <a href={CLI_USAGE} target="_blank" rel="noreferrer noopener">
            README
          </a>
          . The package is on{' '}
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
