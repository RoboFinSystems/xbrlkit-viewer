import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { McpPage } from '../src/pages/McpPage'
import {
  CLAUDE_CODE_HTTP,
  CLAUDE_CODE_STDIO,
  CLIENT_HTTP_JSON,
  CLIENT_STDIO_JSON,
  MCP_URL,
  REGISTRY_NAME,
  SERVE_HTTP,
  SERVE_HTTP_WITH_IDENTITY,
} from '../src/pages/mcpRecipes'

// The recipes mirror xbrlkit's README: the [mcp] extra, @latest, and --from for
// a hand-written config (--with is the registry-composed form; --refresh is
// never the answer).
describe('the launch recipes', () => {
  const launches = [SERVE_HTTP, SERVE_HTTP_WITH_IDENTITY, CLIENT_STDIO_JSON, CLAUDE_CODE_STDIO]

  it('carry the [mcp] extra and @latest, via --from', () => {
    for (const recipe of launches) {
      expect(recipe, recipe).toContain('--from')
      expect(recipe, recipe).toContain('xbrlkit[mcp]@latest')
      expect(recipe, recipe).not.toContain('--with')
      expect(recipe, recipe).not.toContain('--refresh')
    }
  })

  it('serve over stdio when the client launches the server', () => {
    const entry = JSON.parse(CLIENT_STDIO_JSON) as {
      mcpServers: { xbrlkit: { command: string; args: string[]; env: Record<string, string> } }
    }
    expect(entry.mcpServers.xbrlkit.command).toBe('uvx')
    expect(entry.mcpServers.xbrlkit.args.slice(-2)).toEqual(['--transport', 'stdio'])
    expect(entry.mcpServers.xbrlkit.env).toHaveProperty('SEC_GOV_USER_AGENT')
    expect(CLAUDE_CODE_STDIO).toContain('--transport stdio')
  })

  it('point at loopback when the user starts the server', () => {
    expect(MCP_URL.startsWith('http://127.0.0.1:')).toBe(true)
    expect(SERVE_HTTP).toContain(MCP_URL)
    expect(CLAUDE_CODE_HTTP).toContain(`--transport http xbrlkit ${MCP_URL}`)
    const entry = JSON.parse(CLIENT_HTTP_JSON) as {
      mcpServers: { xbrlkit: { type: string; url: string } }
    }
    expect(entry.mcpServers.xbrlkit).toEqual({ type: 'http', url: MCP_URL })
  })
})

describe('McpPage', () => {
  it('renders every recipe, the registry name, and no tool count', () => {
    const html = renderToStaticMarkup(<McpPage />)
    expect(html).toContain('xbrlkit[mcp]@latest')
    expect(html).toContain('--transport')
    expect(html).toContain(MCP_URL)
    expect(html).toContain(REGISTRY_NAME)
    expect(html).toContain('serve/README.md')
    // The count moves with every release; the page links the README instead.
    expect(html).not.toMatch(/\b(ten|fourteen|eighteen|\d+) tools\b/)
  })
})
