import { CodeBlock } from '../components/CodeBlock'
import {
  CLAUDE_CODE_HTTP,
  CLAUDE_CODE_STDIO,
  CLIENT_HTTP_JSON,
  CLIENT_STDIO_JSON,
  REGISTRY_NAME,
  SERVE_HTTP,
  SERVE_HTTP_WITH_IDENTITY,
  SERVE_README,
  UV_INSTALL,
  XBRLKIT_PYPI,
  XBRLKIT_REPO,
} from './mcpRecipes'

/**
 * `/mcp` — how to connect an MCP client to `xbrlkit serve`, the local server
 * in xbrlkit, the package behind this site. The page is the recipe and nothing more:
 * the tools, the switches and what `load_filing` takes live in the package's
 * own serve README, which is linked rather than copied so there is one text
 * to keep true. It deliberately names no tool count — that number has moved
 * three times in ten days. Its title and description live with the other
 * lanes' in `routeMeta.ts`; the app shell applies them.
 */
export function McpPage() {
  return (
    <article className="mcp-page">
      <header>
        <h1>Read a filing in your own AI client</h1>
        <p>
          The xbrlkit package is also a local MCP server. <code>xbrlkit serve</code> holds a filing
          in memory on your machine and exposes it to Claude, Cursor, VS Code or any other MCP
          client through tools shaped for financial reports. It binds to loopback and takes no
          credentials, because nothing off your machine is meant to reach it. Nothing is hosted: no
          account, no key, no index. Every answer is read from the filing on your computer.
        </p>
      </header>

      <section>
        <h3>Start it</h3>
        <p>
          One command. It needs{' '}
          <a href={UV_INSTALL} target="_blank" rel="noreferrer noopener">
            uv
          </a>
          ; the first filing can take a minute while the taxonomy cache warms.
        </p>
        <CodeBlock label="Terminal" code={SERVE_HTTP} />
        <p>
          The <code>[mcp]</code> extra brings the server&apos;s dependencies, and{' '}
          <code>@latest</code> stops uvx reusing the environment it built the first time.
        </p>
      </section>

      <section>
        <h3>Connect a client that launches the server</h3>
        <p>
          Claude Desktop, Cursor and VS Code start the server themselves and talk to it over stdio.
          The identity is optional: EDGAR asks callers to say who they are, and without it the
          server uses a shared default and says so once. A local file, a <code>holon.jsonld</code>{' '}
          or <code>tavi.json</code>, and filings.xbrl.org need none.
        </p>
        <CodeBlock label="mcpServers entry" code={CLIENT_STDIO_JSON} />
        <CodeBlock label="Claude Code" code={CLAUDE_CODE_STDIO} />
      </section>

      <section>
        <h3>Or point a client at the running server</h3>
        <p>
          If you started it in a terminal, the client only needs the URL. The identity goes on the
          command, since an env block in the client config reaches nothing here.
        </p>
        <CodeBlock label="Terminal" code={SERVE_HTTP_WITH_IDENTITY} />
        <CodeBlock label="Claude Code" code={CLAUDE_CODE_HTTP} />
        <CodeBlock label="mcpServers entry" code={CLIENT_HTTP_JSON} />
      </section>

      <section>
        <h3>From the registry</h3>
        <p>
          It is listed in the Official MCP Registry as <code>{REGISTRY_NAME}</code>. A client that
          reads the registry installs it from there and composes the command itself.
        </p>
      </section>

      <section>
        <h3>Then ask</h3>
        <ul>
          <li>
            &ldquo;Load NVDA.&rdquo; A ticker, an EDGAR <code>cik:accession</code>, an{' '}
            <code>lei:</code> for a filing on filings.xbrl.org, a local filing package, or a{' '}
            <code>holon.jsonld</code> or <code>tavi.json</code> by path or URL, a RoboLedger report
            included.
          </li>
          <li>&ldquo;What does the filing say about revenue recognition?&rdquo;</li>
          <li>&ldquo;Show me the balance sheet.&rdquo;</li>
          <li>
            &ldquo;Open it in the viewer.&rdquo; The server serves the loaded filing from your
            machine and opens it here, the way <code>xbrlkit view</code> does.
          </li>
        </ul>
      </section>

      <footer className="mcp-foot">
        <p>
          The tools, the switches and what <code>load_filing</code> takes are in the{' '}
          <a href={SERVE_README} target="_blank" rel="noreferrer noopener">
            serve README
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
