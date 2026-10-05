import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CliPage } from '../src/pages/CliPage'
import { VIEW_SOURCES, VIEW_UVX, WRITE_FILES } from '../src/pages/cliRecipes'

// The commands mirror xbrlkit's README. `view` needs no extra; `serve` belongs to /mcp.
describe('the CLI recipes', () => {
  it('open a filing with uvx and @latest, no extra and no --refresh', () => {
    expect(VIEW_UVX).toBe('uvx xbrlkit@latest view NVDA')
    expect(VIEW_UVX).not.toContain('[')
    expect(VIEW_UVX).not.toContain('--refresh')
  })

  it('leave serve to the MCP page', () => {
    for (const recipe of [VIEW_UVX, VIEW_SOURCES, WRITE_FILES]) {
      expect(recipe, recipe).not.toContain('serve')
    }
  })
})

describe('CliPage', () => {
  it('sends the reader to MCP first, then renders the commands and links the README usage', () => {
    const html = renderToStaticMarkup(<CliPage onNavigate={() => {}} />)
    expect(html.indexOf('href="/mcp"')).toBeGreaterThan(-1)
    expect(html.indexOf('href="/mcp"')).toBeLessThan(html.indexOf('<section>'))
    expect(html).toContain(VIEW_UVX)
    expect(html).toContain('xbrlkit fetch --ticker NVDA')
    expect(html).toContain('xbrlkit#usage')
  })
})
