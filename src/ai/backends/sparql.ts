/**
 * File-mode chat backend for a holon — SPARQL over the report's in-memory RDF
 * store. `describe_report` returns the vocabulary, the node shapes computed
 * from the graph, what is present and example queries; `run_sparql` runs
 * Comunica locally. No network.
 *
 * The same two-tool hand-off as the Tavi model's jq backend, worded in
 * parallel on purpose.
 */
import type { Store } from 'n3'
import { describeReport } from '../describeReport'
import type { ChatBackend } from '../loop'
import type { ToolDef } from '../provider'
import { runSparql } from '../runSparql'
import { isErrorPayload } from '../toolPayload'

const TOOLS: ToolDef[] = [
  {
    name: 'describe_report',
    description:
      "Return the report's RDF vocabulary (SPARQL prefixes, node shapes computed from the graph), the concepts and periods present, and example queries. Call this first — never guess the schema.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'run_sparql',
    description:
      'Run a read-only SPARQL 1.1 SELECT or ASK query over this report and return the rows. Use the prefixes and patterns from describe_report.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'A SPARQL SELECT or ASK query.' } },
      required: ['query'],
      additionalProperties: false,
    },
  },
]

const SYSTEM = `You answer questions about ONE financial report — an XBRL "holon", the filing as RDF — by querying it with read-only SPARQL 1.1.

WORKFLOW:
1. Call describe_report FIRST to get the PREFIX lines, the node shapes computed from this graph, the concepts and periods present, and example queries. Never guess the schema.
2. Write a SPARQL SELECT (always with the PREFIX lines from describe_report, using its patterns) and run it with run_sparql.
3. If a query errors or returns nothing useful, read the message, fix the query, and try again. You have a limited number of steps — do not repeat a failing query unchanged.
4. Answer in natural language, citing the concept and period. Use Markdown — bold the key figures, and a table for multi-row results.

RULES:
- Read-only SELECT or ASK only, always with the PREFIX lines from describe_report.
- Concepts are identified by rs:internalId (the qname literal, e.g. "us-gaap:Revenues") — match on it rather than on the IRI, so a filer's own concepts work without a prefix.
- The consolidated total is the fact WITHOUT rs:dimension — FILTER NOT EXISTS { ?f rs:dimension ?d }; a fact with one is a breakdown (segment, member).
- Never fabricate a figure — a query that returned zero rows is not evidence of a value; if the report does not contain it, say so plainly.`

export function sparqlBackend(store: Store): ChatBackend {
  // Computed on the first describe_report call, not when the report loads.
  let description: string | null = null
  return {
    system: SYSTEM,
    tools: TOOLS,
    queryLabel: 'SPARQL',
    runTool: async (name, input) => {
      if (name === 'describe_report') {
        description ??= describeReport(store)
        return { content: description }
      }
      if (name === 'run_sparql') {
        const query = String(input.query ?? '')
        // A failed query answers with an {error} payload rather than throwing:
        // the loop flags it and the model reads it and retries.
        const content = await runSparql(store, query)
        return { content, isError: isErrorPayload(content), query }
      }
      return { content: `Unknown tool: ${name}`, isError: true }
    },
  }
}
