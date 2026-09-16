import type { NormalizedReport } from '@robosystems/report-components'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AnthropicProvider } from '../ai/anthropic'
import { jqBackend } from '../ai/backends/jq'
import { sparqlBackend } from '../ai/backends/sparql'
import { workerJqRunner } from '../ai/jqRunner'
import { type ChatBackend, runToolLoop } from '../ai/loop'
import type { AIMessage } from '../ai/provider'
import { SUMMARY_PROMPT } from '../ai/reportContext'
import type { ReportSource } from '../ai/source'
import { stripMarkdown } from '../ai/tts'
import { Spinner } from '../components/Spinner'
import { usePersistentApiKey } from '../hooks/usePersistentApiKey'
import { usePersistentModel } from '../hooks/usePersistentModel'
import { useTts } from '../hooks/useTts'

interface ChatTurn {
  role: 'user' | 'assistant'
  text: string
  error?: boolean
  /** The query the loop generated for this answer (assistant turns). */
  query?: string
  /** 'SPARQL' | 'jq' — labels the query reveal. */
  queryLabel?: string
}

interface ChatDrawerProps {
  open: boolean
  onClose: () => void
  /** Current source tab — only decides which "open a report" hint to show. */
  mode: 'file' | 'sec'
  /** The loaded report + its queryable form (RDF store or Tavi document). */
  report: NormalizedReport | null
  source: ReportSource | null
  /** Open the Keys drawer — where the Anthropic (and other) keys are entered. */
  onOpenSettings: () => void
}

const SUMMARY_DISPLAY = 'Give me a business summary of this report.'

/**
 * The chat drawer — a right-side panel that pushes the content aside. It picks
 * a `ChatBackend` by the loaded report's own form: a holon → SPARQL over the
 * in-memory RDF; a Tavi model → jq over the document in a worker. Both tabs
 * load a report the same way, so the chat never leaves the browser. Keys are
 * entered in the Keys drawer.
 *
 * One report-aware extra: a one-click business **Summary** on the empty state.
 * With an ElevenLabs key set, answers can be read aloud (and the summary auto-
 * plays).
 */
export function ChatDrawer({
  open,
  onClose,
  mode,
  report,
  source,
  onOpenSettings,
}: ChatDrawerProps) {
  const llm = usePersistentApiKey('llm')
  const { model } = usePersistentModel()
  const tts = useTts()
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Thinking')
  // Which assistant turn is currently being read aloud (null = none).
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const provider = useMemo(() => (llm.key ? new AnthropicProvider(llm.key) : null), [llm.key])

  const backend = useMemo<ChatBackend | null>(() => {
    if (!report || !source) return null
    return source.format === 'holon'
      ? sparqlBackend(source.store)
      : jqBackend(source.doc, workerJqRunner(source.text))
  }, [report, source])

  // A replaced backend releases what it holds (the jq worker and its document).
  useEffect(() => () => backend?.dispose?.(), [backend])

  // A report is "in context" when the summary makes sense: one is loaded.
  const hasReportContext = Boolean(report)

  // Playback ends (or errors) → drop the per-message speaking highlight.
  useEffect(() => {
    if (!tts.speaking) setSpeakingIdx(null)
  }, [tts.speaking])

  const runQuestion = useCallback(
    async (question: string, opts: { summary?: boolean; display?: string } = {}) => {
      if (busy || !provider || !backend) return
      const { summary = false, display = question } = opts
      const history: AIMessage[] = turns.map((t) => ({ role: t.role, content: t.text }))
      const assistantIdx = turns.length + 1

      setTurns((prev) => [...prev, { role: 'user', text: display }])
      setStatus('Thinking')
      setBusy(true)
      try {
        const res = await runToolLoop(provider, backend, history, question, {
          onProgress: setStatus,
          model,
        })
        const text = res.text || '(no answer returned)'
        setTurns((prev) => [
          ...prev,
          { role: 'assistant', text, query: res.query, queryLabel: backend.queryLabel },
        ])
        if (summary && tts.available) {
          setSpeakingIdx(assistantIdx)
          void tts.speak(stripMarkdown(text))
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setTurns((prev) => [...prev, { role: 'assistant', text: `Error: ${msg}`, error: true }])
      } finally {
        setBusy(false)
        requestAnimationFrame(() => {
          const el = scrollRef.current
          if (el) el.scrollTop = el.scrollHeight
        })
      }
    },
    [busy, provider, backend, turns, tts, model]
  )

  const send = useCallback(() => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    void runQuestion(text)
  }, [draft, runQuestion])

  const readAloud = useCallback(
    (idx: number, text: string) => {
      if (speakingIdx === idx && tts.speaking) {
        tts.stop()
        setSpeakingIdx(null)
        return
      }
      setSpeakingIdx(idx)
      void tts.speak(stripMarkdown(text))
    },
    [speakingIdx, tts]
  )

  const title = 'Ask about this report'
  const canChat = Boolean(provider && backend)

  // Empty-state copy + tap-to-run example questions.
  const emptyLead =
    'Ask about this report and get answers pulled straight from its own figures — never guessed. Start with a question, or get a quick summary.'
  const examples = [
    'What is total assets?',
    'What was net income?',
    'How does this year compare to last?',
  ]

  return (
    <aside className={open ? 'chat-drawer open' : 'chat-drawer'} inert={!open}>
      <div className="chat-inner">
        <div className="chat-header">
          <div className="chat-title">
            <strong>{title}</strong>
          </div>
          <button type="button" className="chat-close" onClick={onClose} aria-label="Close chat">
            ×
          </button>
        </div>

        <div className="chat-messages" ref={scrollRef}>
          {turns.length === 0 ? (
            <div className="chat-empty">
              <div className="chat-empty-icon" aria-hidden="true">
                💬
              </div>
              <p className="chat-empty-lead">{emptyLead}</p>
              {canChat ? (
                <>
                  <p className="chat-examples-label">Try asking</p>
                  <div className="chat-examples">
                    {examples.map((q) => (
                      <button
                        key={q}
                        type="button"
                        className="chat-example"
                        disabled={busy}
                        onClick={() => void runQuestion(q)}
                      >
                        <span>{q}</span>
                      </button>
                    ))}
                  </div>
                  {hasReportContext ? (
                    <button
                      type="button"
                      className="btn chat-summary"
                      disabled={busy}
                      onClick={() =>
                        void runQuestion(SUMMARY_PROMPT, {
                          summary: true,
                          display: SUMMARY_DISPLAY,
                        })
                      }
                    >
                      ✨ Summarize this report{tts.available ? ' (spoken)' : ''}
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : (
            turns.map((turn, i) => {
              const cls = `chat-msg chat-msg-${turn.role}${turn.error ? ' chat-msg-error' : ''}`
              return turn.role === 'assistant' && !turn.error ? (
                <div key={i} className={`${cls} chat-md`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.text}</ReactMarkdown>
                  {turn.query ? (
                    <details className="chat-sparql">
                      <summary>{turn.queryLabel ?? 'Query'}</summary>
                      <pre>{turn.query}</pre>
                    </details>
                  ) : null}
                  {tts.available ? (
                    <button
                      type="button"
                      className="chat-readaloud"
                      onClick={() => readAloud(i, turn.text)}
                    >
                      {speakingIdx === i && tts.speaking ? '⏹ Stop' : '🔊 Read aloud'}
                    </button>
                  ) : null}
                </div>
              ) : (
                <div key={i} className={cls}>
                  {turn.text}
                </div>
              )
            })
          )}
          {busy ? (
            <div className="chat-msg chat-msg-assistant chat-thinking">
              <Spinner label={`${status}…`} />
            </div>
          ) : null}
        </div>

        {!llm.isStored ? (
          <div className="chat-connect">
            <p className="hint">Add your Anthropic API key to start chatting.</p>
            <button type="button" className="btn btn-sm" onClick={onOpenSettings}>
              Open Settings
            </button>
          </div>
        ) : !backend ? (
          <p className="hint chat-connect">
            {mode === 'sec' ? (
              <>
                Search a company and open a filing in the <strong>SEC</strong> tab, then ask about
                it.
              </>
            ) : (
              <>
                Open a <code>holon.jsonld</code> or <code>tavi.json</code> in <strong>File</strong>{' '}
                mode, then ask about it.
              </>
            )}
          </p>
        ) : (
          <>
            <form
              className="chat-input"
              onSubmit={(e) => {
                e.preventDefault()
                send()
              }}
            >
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask…"
                disabled={busy}
              />
              <button type="submit" className="btn btn-sm" disabled={busy || !draft.trim()}>
                Send
              </button>
            </form>
            {tts.error ? <p className="hint chat-tts-error">🔇 {tts.error}</p> : null}
          </>
        )}
      </div>
    </aside>
  )
}
