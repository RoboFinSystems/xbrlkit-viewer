import { describe, expect, it } from 'vitest'
import { laneFromLocation, laneFromPath, LANES, pathForLane, VIEW_PATH } from '../src/pages/route'

const CDN = 'https://public.robosystems.ai/2025/0001045810/0001045810-25-000023/tavi.json'

describe('laneFromLocation', () => {
  it('opens the SEC lane on the apex', () => {
    expect(laneFromLocation('/', '')).toBe('sec')
    expect(laneFromLocation('', '')).toBe('sec')
  })

  // The SEC catalog and earlier xbrlkit releases write `/?url=`; it must keep opening the report.
  it('opens a linked report on the apex in the File lane', () => {
    expect(laneFromLocation('/', `?url=${encodeURIComponent(CDN)}`)).toBe('file')
    expect(laneFromLocation('/index.html', `?url=${encodeURIComponent(CDN)}`)).toBe('file')
  })

  it('ignores a ?url= that is not a web URL', () => {
    expect(laneFromLocation('/', `?url=${encodeURIComponent('javascript:alert(1)')}`)).toBe('sec')
    expect(laneFromLocation('/', '?url=')).toBe('sec')
  })

  it('names the File and MCP lanes, with a trailing slash or index.html', () => {
    for (const path of ['/file', '/file/', '/file/index.html']) {
      expect(laneFromLocation(path, ''), path).toBe('file')
    }
    for (const path of ['/mcp', '/mcp/', '/mcp/index.html']) {
      expect(laneFromLocation(path, ''), path).toBe('mcp')
    }
  })

  it('keeps a ?url= on the File lane and never moves MCP', () => {
    expect(laneFromLocation('/file', `?url=${encodeURIComponent(CDN)}`)).toBe('file')
    expect(laneFromLocation('/mcp', `?url=${encodeURIComponent(CDN)}`)).toBe('mcp')
  })

  it('is the SEC lane for any other path', () => {
    expect(laneFromLocation('/mcp-server', '')).toBe('sec')
    expect(laneFromLocation('/files', '')).toBe('sec')
  })

  it('round-trips through pathForLane', () => {
    for (const lane of LANES) {
      expect(laneFromLocation(pathForLane(lane), '')).toBe(lane)
    }
  })
})

// The head follows the path: a `/?url=` link is the apex page and keeps the apex canonical.
describe('laneFromPath', () => {
  it('names the page a path is served, whatever the query', () => {
    expect(laneFromPath('/')).toBe('sec')
    expect(laneFromPath('/file/')).toBe('file')
    expect(laneFromPath('/mcp/index.html')).toBe('mcp')
  })

  it('keeps the apex page for a ?url= link that shows the File lane', () => {
    const search = `?url=${encodeURIComponent(CDN)}`
    expect(laneFromLocation('/', search)).toBe('file')
    expect(laneFromPath('/')).toBe('sec')
  })
})

// `xbrlkit view` and `view_filing` open `/view?url=`; installed releases depend on it.
describe('the /view link path', () => {
  it('opens a linked report in the File lane', () => {
    expect(VIEW_PATH).toBe('/view')
    expect(laneFromLocation('/view', `?url=${encodeURIComponent(CDN)}`)).toBe('file')
    expect(laneFromLocation('/view/', `?url=${encodeURIComponent(CDN)}`)).toBe('file')
  })

  it('carries the apex head, so the canonical stays /', () => {
    expect(laneFromPath('/view')).toBe('sec')
  })

  it('is the SEC lane without a link', () => {
    expect(laneFromLocation('/view', '')).toBe('sec')
  })
})
