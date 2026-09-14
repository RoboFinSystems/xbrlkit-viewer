import type { TaviDocument } from '@robosystems/report-components/adapters'
import { loadJq, type Jq } from 'jq-wasm'
import type { Store } from 'n3'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  describeModel,
  modelSamples,
  exampleQueries as taviExamples,
} from '../src/ai/describeModel'
import {
  describeReport,
  exampleQueries as holonExamples,
  PREFIX_BLOCK,
  reportSamples,
} from '../src/ai/describeReport'
import { buildStore } from '../src/ai/rdf'
import { evaluateJq } from '../src/ai/runJq'
import { runSparql } from '../src/ai/runSparql'
import { isErrorPayload } from '../src/ai/toolPayload'

// Both chat backends over a RoboLedger report (the SaaS-startup demo), which
// differs from a filing in every way the hand-off depended on: no dei facts, no
// us-gaap concepts, no form or fiscal-year focus, no rs:durationType, and not
// one dimensional fact. Every other fixture here is an SEC filing, so the
// prompts claimed SEC metadata a ledger holon does not have and handed the
// model five example queries that returned nothing.
const here = dirname(fileURLToPath(import.meta.url))
const fixture = (name: string) => readFileSync(join(here, 'fixtures', name), 'utf8')
const require = createRequire(import.meta.url)

const taviText = fixture('saas-startup-demo.tavi.json')
const taviDoc = JSON.parse(taviText) as TaviDocument

let store: Store
let jq: Jq
beforeAll(async () => {
  store = await buildStore(fixture('saas-startup-demo.holon.jsonld'))
  jq = await loadJq({ wasmBinary: readFileSync(require.resolve('jq-wasm/jq.wasm')) })
}, 60_000)

const parse = (payload: string) =>
  JSON.parse(payload) as { row_count?: number; result_count?: number }

describe('describe_report over a RoboLedger holon', () => {
  it('names the entity and the metadata the report carries', () => {
    const described = describeReport(store)
    expect(described).toContain('Report: Cadence Labs, Inc.')
    // Never "form ?, fiscal year ?" — a ledger report has neither.
    expect(described).not.toMatch(/form \?/)
    expect(described).not.toMatch(/fiscal year \?/)
    // Its id is a report id, not an SEC accession.
    expect(described).toMatch(/report rpt_[0-9A-Z]+/)
    expect(described).toContain('reporting style sec-as-filed')
  })

  it('counts each node once despite the named-graph partition', () => {
    // A concept with a fact appears in both #scene and #projection. Walking type
    // quads and then all of a subject's quads counted such a node four times:
    // this report has 98 elements and was described as "skos:prefLabel ×224".
    const described = describeReport(store)
    expect(described).toContain('rs:Element ×98')
    expect(described).toMatch(/rs:Element ×98: [^\n]*skos:prefLabel ×98/)
    expect(described).not.toContain('×224')
  })

  it('does not promise predicates this graph has no instance of', () => {
    const described = describeReport(store)
    // No period carries rs:durationType here, and no fact is dimensional.
    expect(described).not.toContain('rs:durationType')
    expect(described).toContain('every value is consolidated')
    // The concept it names in the how-to is one this report actually reports.
    expect(described).toContain('"rs-gaap:NetIncomeLoss"')
    expect(described).not.toContain('us-gaap:Revenues')
  })

  it('hands over example queries that return rows on THIS report', async () => {
    // Five patterns, less the breakdown one — nothing here is dimensional.
    const examples = holonExamples(reportSamples(store))
    expect(examples).toHaveLength(4)
    for (const [why, query] of examples) {
      const payload = await runSparql(store, `${PREFIX_BLOCK}\n${query}`)
      expect(isErrorPayload(payload), why).toBe(false)
      expect(parse(payload).row_count, why).toBeGreaterThan(0)
    }
  }, 60_000)
})

describe('describe_model over a RoboLedger Tavi model', () => {
  it('names the entity from its label, not its SQName alone', () => {
    // The name rides an xbrl:label; the SQName stays for queries that need it.
    const described = describeModel(taviDoc)
    expect(described).toContain('Cadence Labs, Inc. (entity:entity_')
  })

  it('hands over example programs that return results on THIS document', () => {
    // Six patterns, less the breakdown one — nothing here is dimensional.
    const examples = taviExamples(modelSamples(taviDoc.xbrlModel ?? {}))
    expect(examples).toHaveLength(5)
    for (const [why, program] of examples) {
      const payload = evaluateJq(jq, taviText, program)
      expect(isErrorPayload(payload), why).toBe(false)
      expect(parse(payload).result_count, why).toBeGreaterThan(0)
    }
  })

  it('names no us-gaap concept and no SEC role', () => {
    const described = describeModel(taviDoc)
    expect(described).not.toContain('us-gaap:')
    expect(described).not.toContain('ConsolidatedStatementofIncome')
  })
})
