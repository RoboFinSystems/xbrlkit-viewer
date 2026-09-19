import type { NormalizedReport } from '@robosystems/report-components'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import type { ReportSource } from './ai/source'
import { KeysDrawer } from './chat/KeysDrawer'
import { BotIcon, GearIcon, GitHubIcon, MoonIcon, SunIcon } from './components/icons'
import { Spinner } from './components/Spinner'
import { useTheme } from './hooks/useTheme'
import { FileMode } from './modes/FileMode'
import { SecMode } from './modes/SecMode'
import { McpPage } from './pages/McpPage'
import { laneFromLocation, laneFromPath, pathForLane, type Lane } from './pages/route'
import { applyRouteMeta, VIEWER_REPO } from './pages/routeMeta'

// Lazy: the chat drawer pulls in Comunica, the Anthropic SDK, and markdown
// (~2 MB). Load that chunk only when the user first opens the drawer, keeping
// the report-render path lean.
const ChatDrawer = lazy(() => import('./chat/ChatDrawer').then((m) => ({ default: m.ChatDrawer })))

type ViewerLane = Exclude<Lane, 'mcp'>

function currentLane(): Lane {
  return laneFromLocation(window.location.pathname, window.location.search)
}

/**
 * Bring the head in step with the address. It follows the path, not the lane
 * shown: a `/?url=` link shows the File lane but is the apex page, and keeps
 * the apex canonical the served HTML already carries, so the many links the
 * company pages and the CLI write consolidate on `/`.
 */
function syncHead(): void {
  applyRouteMeta(laneFromPath(window.location.pathname))
}

export function App() {
  // `/` is the SEC lane, `/file` the File lane (and `/?url=`), `/mcp` the connect page.
  const [lane, setLane] = useState<Lane>(currentLane)
  // The last viewer lane, so the chat's hint still names it while MCP is showing.
  const [viewerLane, setViewerLane] = useState<ViewerLane>(() => {
    const initial = currentLane()
    return initial === 'mcp' ? 'sec' : initial
  })
  const [report, setReport] = useState<NormalizedReport | null>(null)
  // The loaded file's queryable form (RDF store or Tavi document), for the chat.
  const [source, setSource] = useState<ReportSource | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  // Mounts the lazy drawer on first open, then keeps it mounted (state + layout).
  const [chatMounted, setChatMounted] = useState(false)
  const [keysOpen, setKeysOpen] = useState(false)
  const { theme, toggle: toggleTheme } = useTheme()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  const showLane = useCallback((next: Lane) => {
    setLane(next)
    if (next !== 'mcp') setViewerLane(next)
  }, [])

  // Back and Forward move between the lanes like any other pages.
  useEffect(() => {
    const onPop = () => showLane(currentLane())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [showLane])

  // The served HTML carries the head for its path; keep it in step after a move.
  useEffect(() => {
    syncHead()
  }, [lane])

  // A move pushes the lane's bare path, which also drops a `?url=` the visitor
  // arrived with, so the File lane cannot reopen that link on a later remount.
  const navigate = useCallback(
    (next: Lane) => {
      if (next !== lane) window.history.pushState(null, '', pathForLane(next))
      showLane(next)
    },
    [lane, showLane]
  )

  const onLoaded = useCallback((r: NormalizedReport, s: ReportSource, name: string) => {
    setReport(r)
    setSource(s)
    setFileName(name)
  }, [])
  const onReset = useCallback(() => {
    setReport(null)
    setSource(null)
    setFileName(null)
  }, [])
  // "Load another" from a report opened by `/?url=` lands on the File lane's own
  // address, without the link, so a reload shows the dropzone rather than the report.
  const onFileReset = useCallback(() => {
    onReset()
    if (window.location.pathname !== pathForLane('file') || window.location.search) {
      window.history.replaceState(null, '', pathForLane('file'))
      syncHead()
    }
  }, [onReset])

  // The two right-side drawers share one slot, so opening one closes the other.
  const toggleChat = useCallback(() => {
    setChatMounted(true)
    setChatOpen((o) => !o)
    setKeysOpen(false)
  }, [])
  const toggleKeys = useCallback(() => {
    setKeysOpen((o) => !o)
    setChatOpen(false)
  }, [])
  const openSettings = useCallback(() => {
    setKeysOpen(true)
    setChatOpen(false)
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-name">xbrlkit</div>
        </div>

        <div className="header-right">
          <button
            type="button"
            className="btn btn-secondary icon-btn"
            aria-pressed={chatOpen}
            aria-label="Ask"
            title="Ask"
            onClick={toggleChat}
          >
            <BotIcon />
          </button>
          <button
            type="button"
            className="btn btn-secondary icon-btn"
            aria-pressed={keysOpen}
            aria-label="Settings"
            title="Settings"
            onClick={toggleKeys}
          >
            <GearIcon />
          </button>
          <button
            type="button"
            className="btn btn-secondary icon-btn"
            aria-label={`Switch to ${nextTheme} theme`}
            title={`Switch to ${nextTheme} theme`}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <nav className="mode-switch" role="tablist" aria-label="View">
            <button
              type="button"
              role="tab"
              aria-selected={lane === 'sec'}
              onClick={() => navigate('sec')}
            >
              SEC
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={lane === 'file'}
              onClick={() => navigate('file')}
            >
              File
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={lane === 'mcp'}
              onClick={() => navigate('mcp')}
            >
              MCP
            </button>
          </nav>
        </div>
      </header>

      <div className="app-body">
        <div className="app-content">
          <main className="app-main">
            {lane === 'mcp' ? (
              <McpPage />
            ) : lane === 'file' ? (
              <FileMode
                report={report}
                fileName={fileName}
                onLoaded={onLoaded}
                onReset={onFileReset}
              />
            ) : (
              <SecMode
                report={report}
                onLoaded={onLoaded}
                onReset={onReset}
                onNavigate={navigate}
              />
            )}
          </main>
          <footer className="app-footer">
            <span>© 2026 RFS LLC. All rights reserved.</span>
            <a
              className="app-footer-link"
              href="https://robosystems.ai"
              target="_blank"
              rel="noreferrer noopener"
            >
              <img className="app-footer-logo" src="/images/logos/logo_black.png" alt="" />a
              RoboSystems project
            </a>
            <a
              className="app-footer-link"
              href={VIEWER_REPO}
              target="_blank"
              rel="noreferrer noopener"
            >
              <GitHubIcon />
              GitHub
            </a>
          </footer>
        </div>
        {chatMounted ? (
          <Suspense
            fallback={
              <aside className="chat-drawer open">
                <div className="chat-inner">
                  <div className="loading-center">
                    <Spinner label="Loading…" />
                  </div>
                </div>
              </aside>
            }
          >
            <ChatDrawer
              open={chatOpen}
              onClose={() => setChatOpen(false)}
              mode={viewerLane}
              report={report}
              source={source}
              onOpenSettings={openSettings}
            />
          </Suspense>
        ) : null}
        <KeysDrawer open={keysOpen} onClose={() => setKeysOpen(false)} />
      </div>
    </div>
  )
}
