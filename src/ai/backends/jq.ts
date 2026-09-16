/**
 * File-mode chat backend for a Tavi compiled model — read-only jq over the
 * document, in a worker. `describe_model` returns the layout, what is present
 * and example programs; `run_jq` runs one program. No network.
 *
 * The same two-tool hand-off as the holon's SPARQL backend, worded in parallel
 * on purpose (as filing-ladder's rungs 5c / 7b are), so the only variable
 * between the two is the representation.
 */
import type { TaviDocument } from '@robosystems/report-components/adapters'
import { describeModel } from '../describeModel'
import type { JqRunner } from '../jqRunner'
import type { ChatBackend } from '../loop'
import type { ToolDef } from '../provider'
import { isErrorPayload } from '../toolPayload'

const TOOLS: ToolDef[] = [
  {
    name: 'describe_model',
    description:
      "Return how this report's Tavi compiled model is laid out (facts, dimensions, periods, the taxonomy objects), the concepts, periods, units, axes and groups present, and example jq programs. Call this first — never guess the shape.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'run_jq',
    description:
      'Run a read-only jq program over the whole compiled model and return its outputs. The input is the document, so start from .xbrlModel; use the patterns from describe_model.',
    inputSchema: {
      type: 'object',
      properties: {
        program: { type: 'string', description: 'A jq program (jq 1.8 syntax).' },
      },
      required: ['program'],
      additionalProperties: false,
    },
  },
]

const SYSTEM = `You answer questions about ONE financial report — a Project Tavi compiled model (XBRL International's OIM Taxonomy Model): one JSON document holding the facts AND the taxonomy that gives them meaning (labels, presentation and calculation networks, cubes) — by querying it with read-only jq.

WORKFLOW:
1. Call describe_model FIRST to learn how the document is laid out, the concepts, periods, units, axes and groups present, and example programs. Never guess the shape.
2. Write a jq program (starting from .xbrlModel, using the patterns from describe_model) and run it with run_jq.
3. If a program errors or returns nothing useful, read the message, fix it, and try again. You have a limited number of steps — do not repeat a failing program unchanged.
4. Answer in natural language, citing the concept and period. Use Markdown — bold the key figures, and a table for multi-row results.

RULES:
- The consolidated total of a concept is the fact whose factDimensions has NO key outside xbrl:*; any other key is a breakdown (segment, member).
- Values are strings — use tonumber. decimals -6 means the value is exact to millions; report figures with their unit and scale.
- Periods are dateTime intervals with an EXCLUSIVE end: "2024-01-01T00:00:00/2025-01-01T00:00:00" is calendar 2024; an instant "2025-01-01T00:00:00" is the close of 2024-12-31.
- Never fabricate a figure — a program that returned nothing is not evidence of a value; if the report does not contain it, say so plainly.`

export function jqBackend(doc: TaviDocument, runner: JqRunner): ChatBackend {
  // Computed on the first describe_model call, not when the report loads.
  let description: string | null = null
  return {
    system: SYSTEM,
    tools: TOOLS,
    queryLabel: 'jq',
    runTool: async (name, input) => {
      if (name === 'describe_model') {
        description ??= describeModel(doc)
        return { content: description }
      }
      if (name === 'run_jq') {
        const program = String(input.program ?? '')
        // A failed program answers with an {error} payload rather than
        // throwing: the loop flags it and the model reads it and retries.
        const content = await runner.run(program)
        return { content, isError: isErrorPayload(content), query: program }
      }
      return { content: `Unknown tool: ${name}`, isError: true }
    },
    dispose: () => runner.dispose(),
  }
}
