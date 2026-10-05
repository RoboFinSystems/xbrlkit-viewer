import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PythonPage } from '../src/pages/PythonPage'
import { PY_INSTALL, PY_LOAD, PY_QUERY, PY_SERIALIZE } from '../src/pages/pythonRecipes'

// The code goes through FilingSession, which xbrlkit.serve declares as API, and needs no extra.
describe('the Python recipes', () => {
  it('install the bare package', () => {
    expect(PY_INSTALL).toBe('pip install xbrlkit')
  })

  it('load through the declared session, not the Arelle-level pair', () => {
    expect(PY_LOAD).toContain('from xbrlkit.serve import FilingSession')
    for (const recipe of [PY_LOAD, PY_SERIALIZE, PY_QUERY]) {
      expect(recipe, recipe).not.toContain('load_model')
      expect(recipe, recipe).not.toContain('to_xbrl_model')
    }
  })
})

describe('PythonPage', () => {
  it('points to MCP and the CLI before the code, and links the README', () => {
    const html = renderToStaticMarkup(<PythonPage onNavigate={() => {}} />)
    const firstSection = html.indexOf('<section>')
    expect(html.indexOf('href="/mcp"')).toBeLessThan(firstSection)
    expect(html.indexOf('href="/cli"')).toBeLessThan(firstSection)
    expect(html).toContain('FilingSession')
    expect(html).toContain('xbrlkit#usage')
  })
})
