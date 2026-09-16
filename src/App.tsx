import type { NormalizedReport } from '@robosystems/report-components'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import type { ReportSource } from './ai/source'
import { KeysDrawer } from './chat/KeysDrawer'
import { BotIcon, GearIcon, GitHubIcon } from './components/icons'
import { Spinner } from './components/Spinner'
import { FileMode } from './modes/FileMode'
import { SecMode } from './modes/SecMode'
import { McpPage } from './pages/McpPage'
import { pageFromPath, pathForPage, type Page } from './pages/route'

// Lazy: the chat drawer pulls in Comunica, the Anthropic SDK, and markdown
// (~2 MB). Load that chunk only when the user first opens the drawer, keeping
// the report-render path lean.
const ChatDrawer = lazy(() => import('./chat/ChatDrawer').then((m) => ({ default: m.ChatDrawer })))

type Mode = 'file' | 'sec'

export function App() {
  // `/` is the viewer, in one of its two modes; `/mcp` is the connect page.
  const [page, setPage] = useState<Page>(() => pageFromPath(window.location.pathname))
  const [mode, setMode] = useState<Mode>('file')
  const [report, setReport] = useState<NormalizedReport | null>(null)
  // The loaded file's queryable form (RDF store or Tavi document), for the chat.
  const [source, setSource] = useState<ReportSource | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  // Mounts the lazy drawer on first open, then keeps it mounted (state + layout).
  const [chatMounted, setChatMounted] = useState(false)
  const [keysOpen, setKeysOpen] = useState(false)

  // Back and Forward move between the two addresses like any other pages.
  useEffect(() => {
    const onPop = () => setPage(pageFromPath(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback(
    (next: Page) => {
      if (next !== page) window.history.pushState(null, '', pathForPage(next))
      setPage(next)
    },
    [page]
  )
  const showMode = useCallback(
    (next: Mode) => {
      setMode(next)
      navigate('viewer')
    },
    [navigate]
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
          <div className="brand-name">
            xbrlkit <span className="brand-name-tool">viewer</span>
          </div>
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
          <nav className="mode-switch" role="tablist" aria-label="View">
            <button
              type="button"
              role="tab"
              aria-selected={page === 'viewer' && mode === 'file'}
              onClick={() => showMode('file')}
            >
              File
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={page === 'viewer' && mode === 'sec'}
              onClick={() => showMode('sec')}
            >
              SEC
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={page === 'mcp'}
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
            {page === 'mcp' ? (
              <McpPage />
            ) : mode === 'file' ? (
              <FileMode report={report} fileName={fileName} onLoaded={onLoaded} onReset={onReset} />
            ) : (
              <SecMode report={report} onLoaded={onLoaded} onReset={onReset} />
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
              href="https://github.com/RoboFinSystems/xbrlkit-viewer"
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
              mode={mode}
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
