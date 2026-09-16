/**
 * The agentic tool-use loop — the browser port of the backend `tool_loop.py`.
 *
 * Provider-neutral AND backend-neutral: it drives any `ChatBackend` (a tool set +
 * an executor + a system prompt) through a bounded loop — the model calls tools,
 * sees errors fed back as is_error results and retries, then answers. The app
 * plugs in a local SPARQL (holon) or jq (Tavi) backend for the report on
 * screen. Neither the provider nor the tool wiring leaks into this file.
 */
import type { AIMessage, AIProvider, ContentBlock, ToolDef } from './provider'

// Enough for describe → a query → two or three corrections → answer. The
// filing-ladder harness this mirrors sees ~4 turns per question on the
// describe-and-one-query hand-offs, with 5 on lookups.
const MAX_ITERATIONS = 8
// Cap tool results fed back so a large result can't blow the context window.
// filing-ladder's clip; the local tools clip themselves to the same size.
const MAX_RESULT_CHARS = 60_000

/** One tool execution's outcome. */
export interface ToolRun {
  content: string
  isError?: boolean
  /** A query string (SPARQL / jq) to surface in the UI reveal. */
  query?: string
}

/** A pluggable chat backend: the tools, how to run them, and the system prompt. */
export interface ChatBackend {
  system: string
  tools: ToolDef[]
  /** Label for the generated-query reveal, e.g. 'SPARQL' or 'jq'. */
  queryLabel: string
  /**
   * `onProgress` lets a tool report what it is doing while it runs, so the UI
   * can show real work rather than a static label. The local tools ignore it.
   */
  runTool: (
    name: string,
    input: Record<string, unknown>,
    onProgress?: (status: string) => void
  ) => Promise<ToolRun>
  /** Release what the backend holds (a worker, a document) when it is replaced. */
  dispose?: () => void
}

export interface LoopResult {
  text: string
  query?: string
}

export interface LoopOptions {
  /** Appended to the backend's system prompt for this run. */
  contextNote?: string
  /**
   * Called as the loop moves through phases (thinking → running a tool →
   * interpreting), so the UI can show what the agent is actually doing rather
   * than a single static label.
   */
  onProgress?: (status: string) => void
  /** Anthropic model id for this run; the provider defaults when omitted. */
  model?: string
}

// Tool name → what to tell the user while it runs. Covers every backend's
// tools; anything unmapped falls back to a generic "Working".
const TOOL_STATUS: Record<string, string> = {
  describe_report: 'Reading the report',
  describe_model: 'Reading the model',
  run_sparql: 'Querying the report',
  run_jq: 'Querying the model',
}

export async function runToolLoop(
  provider: AIProvider,
  backend: ChatBackend,
  history: AIMessage[],
  question: string,
  opts: LoopOptions = {}
): Promise<LoopResult> {
  const { contextNote, onProgress, model } = opts
  const messages: AIMessage[] = [...history, { role: 'user', content: question }]
  const system = contextNote ? `${backend.system}\n\n${contextNote}` : backend.system
  let lastQuery: string | undefined

  onProgress?.('Thinking')
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const res = await provider.createMessage({
      model,
      system,
      messages,
      tools: backend.tools,
    })
    if (res.stopReason !== 'tool_use') {
      return { text: res.content, query: lastQuery }
    }

    // Replay the assistant turn (text + tool_use blocks) verbatim.
    messages.push({ role: 'assistant', content: res.blocks })

    const results: ContentBlock[] = []
    for (const block of res.blocks) {
      if (block.type !== 'tool_use') continue
      const label = TOOL_STATUS[block.name] ?? 'Working'
      onProgress?.(label)
      let content: string
      let isError: boolean
      try {
        const run = await backend.runTool(block.name, block.input, (status) =>
          onProgress?.(`${label} — ${status}`)
        )
        content = run.content
        isError = run.isError ?? false
        if (run.query) lastQuery = run.query
      } catch (e) {
        content = `Error: ${e instanceof Error ? e.message : String(e)}`
        isError = true
      }
      if (content.length > MAX_RESULT_CHARS) {
        content = `${content.slice(0, MAX_RESULT_CHARS)}\n…[truncated]`
      }
      results.push({ type: 'tool_result', toolUseId: block.id, content, isError })
    }
    messages.push({ role: 'user', content: results })
    onProgress?.('Interpreting results')
  }

  // Step limit hit — one final turn to answer from what was gathered.
  const final = await provider.createMessage({
    model,
    system,
    messages: [
      ...messages,
      {
        role: 'user',
        content: 'You have reached the step limit. Answer now from the results gathered so far.',
      },
    ],
    tools: backend.tools,
  })
  return {
    text: final.content || 'I gathered results but ran out of steps before answering.',
    query: lastQuery,
  }
}
