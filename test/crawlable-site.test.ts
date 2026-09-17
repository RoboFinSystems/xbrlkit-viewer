import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Vitest runs from the repo root; the happy-dom environment gives import.meta.url no file scheme.
const read = (path: string): string => readFileSync(join(process.cwd(), path), 'utf8')

describe('what a crawler without JavaScript gets', () => {
  const noscript = read('index.html').match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1] ?? ''

  it('links the other two pages and credits RoboSystems, not just names them', () => {
    expect(noscript).toContain('<a href="/file">')
    expect(noscript).toContain('<a href="/mcp">')
    expect(noscript).toContain('<a href="https://robosystems.ai">')
  })
})

describe('CloudFront error responses', () => {
  const template = read('cloudformation/template.yaml')
  const block = template.match(/CustomErrorResponses:\n([\s\S]*?)\n {8}\w/)?.[1] ?? ''

  // Every path the site serves is mapped to a real file by the viewer-request function, so an
  // unknown path answering 200 was a soft 404: the homepage again at every mistyped URL.
  it('answers an unknown path with a real 404, keeping the apex page as the body', () => {
    expect(block).toContain('ErrorCode: 403')
    expect(block).toContain('ErrorCode: 404')
    expect(block).not.toMatch(/ResponseCode: 200/)
    expect(block.match(/ResponseCode: 404/g)).toHaveLength(2)
    expect(block.match(/ResponsePagePath: \/index\.html/g)).toHaveLength(2)
  })
})
