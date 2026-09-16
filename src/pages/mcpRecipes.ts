/**
 * The connection recipes the MCP page shows. They mirror xbrlkit's own README
 * ("Serve to an MCP client"), which is the source of truth — a change there is
 * a change here. Two things in the command matter: the `[mcp]` extra, which
 * brings the server's dependencies (`uvx xbrlkit` alone has no `serve`), and
 * `@latest`, without which uvx keeps reusing the environment it built the
 * first time. A registry-composed entry uses `--with` instead, because the
 * client appends `xbrlkit@<version>` itself; a hand-written config wants
 * `--from`.
 */
export const MCP_URL = 'http://127.0.0.1:8765/mcp'
export const REGISTRY_NAME = 'ai.robosystems/xbrlkit'
export const SERVE_README =
  'https://github.com/RoboFinSystems/xbrlkit/blob/main/xbrlkit/serve/README.md'
export const XBRLKIT_REPO = 'https://github.com/RoboFinSystems/xbrlkit'
export const XBRLKIT_PYPI = 'https://pypi.org/project/xbrlkit/'
export const UV_INSTALL = 'https://docs.astral.sh/uv/getting-started/installation/'

/** Start the server yourself; it listens on loopback. */
export const SERVE_HTTP = `uvx --from "xbrlkit[mcp]@latest" xbrlkit serve
# → MCP at ${MCP_URL}`

/** The same, identified to EDGAR. */
export const SERVE_HTTP_WITH_IDENTITY = `SEC_GOV_USER_AGENT="Your Name you@example.com" \\
  uvx --from "xbrlkit[mcp]@latest" xbrlkit serve`

/** Claude Code, pointed at a server you started. */
export const CLAUDE_CODE_HTTP = `claude mcp add --transport http xbrlkit ${MCP_URL}`

/** Any client that takes a URL. */
export const CLIENT_HTTP_JSON = `{
  "mcpServers": {
    "xbrlkit": { "type": "http", "url": "${MCP_URL}" }
  }
}`

/** A client that launches the server itself, over stdio. */
export const CLIENT_STDIO_JSON = `{
  "mcpServers": {
    "xbrlkit": {
      "command": "uvx",
      "args": [
        "--from", "xbrlkit[mcp]@latest",
        "xbrlkit", "serve", "--transport", "stdio"
      ],
      "env": { "SEC_GOV_USER_AGENT": "Your Name you@example.com" }
    }
  }
}`

/** Claude Code, launching the server itself. */
export const CLAUDE_CODE_STDIO = `claude mcp add xbrlkit -e SEC_GOV_USER_AGENT="Your Name you@example.com" \\
  -- uvx --from "xbrlkit[mcp]@latest" xbrlkit serve --transport stdio`
