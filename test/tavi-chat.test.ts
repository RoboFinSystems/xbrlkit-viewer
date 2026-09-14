// @vitest-environment node
import type { TaviDocument } from '@robosystems/report-components/adapters'
import { loadJq, type Jq } from 'jq-wasm'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { describeModel, exampleQueries, modelSamples } from '../src/ai/describeModel'
import { evaluateJq } from '../src/ai/runJq'
import { isErrorPayload } from '../src/ai/toolPayload'

// The Tavi chat backend's two tools over a real xbrlkit Tavi document (3M
// FY2024, the two primary statements): the model is oriented by describe_model
// and every example program it is handed actually runs on jq-wasm.
const here = dirname(fileURLToPath(import.meta.url))
const text = readFileSync(join(here, 'fixtures', 'mmm-fy2024-statements.tavi.json'), 'utf8')
const doc = JSON.parse(text) as TaviDocument
const require = createRequire(import.meta.url)

let jq: Jq
beforeAll(async () => {
  // The bytes explicitly, so the test does not depend on which jq-wasm build
  // (node or browser) the runner's export conditions pick.
  jq = await loadJq({ wasmBinary: readFileSync(require.resolve('jq-wasm/jq.wasm')) })
})

const parse = (payload: string) =>
  JSON.parse(payload) as {
    result_count?: number
    results?: unknown[]
    note?: string
    error?: string
  }

describe('describe_model', () => {
  it('orients the model on this document', () => {
    const described = describeModel(doc)
    expect(described).toContain('Report: ')
    expect(described).toContain('rpt:cik-0000066740')
    expect(described).toContain('facts ×526')
    expect(described).toMatch(/us-gaap:\w+ → ".+" \(\d+ facts\)/)
    expect(described).toContain('Periods present')
    expect(described).toContain('Units present')
    expect(described).toContain('Groups (statements and notes')
    for (const [, program] of exampleQueries(modelSamples(doc.xbrlModel ?? {})))
      expect(described).toContain(program)
  })
})

describe('run_jq', () => {
  it('runs every example program the model is handed', () => {
    for (const [why, program] of exampleQueries(modelSamples(doc.xbrlModel ?? {}))) {
      const payload = evaluateJq(jq, text, program)
      expect(isErrorPayload(payload), why).toBe(false)
      // Derived from this document, so each one must also FIND something.
      expect(parse(payload).result_count, why).toBeGreaterThan(0)
    }
  })

  it('reads the consolidated total of a concept', () => {
    const payload = parse(
      evaluateJq(
        jq,
        text,
        `[.xbrlModel.facts[]
  | select(.factDimensions["xbrl:concept"] == "us-gaap:Assets")
  | select([.factDimensions | keys[] | select(startswith("xbrl:") | not)] | length == 0)
  | {period: .factDimensions["xbrl:period"], value: (.factValues[0].value | tonumber)}]
| sort_by(.period) | reverse`
      )
    )
    expect(payload.error).toBeUndefined()
    const rows = payload.results?.[0] as { period: string; value: number }[]
    expect(rows.length).toBeGreaterThan(0)
    expect(typeof rows[0].value).toBe('number')
    // The fixture predates xbrlkit's exclusive-end dateTime periods; either form is a date first.
    expect(rows[0].period).toMatch(/^\d{4}-\d{2}-\d{2}/)
  })

  it('returns a jq error the model can read and fix', () => {
    const payload = evaluateJq(jq, text, '.xbrlModel | foo(')
    expect(isErrorPayload(payload)).toBe(true)
    expect(parse(payload).error).toMatch(/^jq error: /)
  })

  it('notes an empty result so it is not read as a value', () => {
    const payload = parse(
      evaluateJq(
        jq,
        text,
        '[.xbrlModel.facts[] | select(.factDimensions["xbrl:concept"] == "us-gaap:NoSuchConcept")]'
      )
    )
    expect(payload.result_count).toBe(1)
    expect(payload.results).toEqual([[]])
    expect(payload.note).toMatch(/^empty result/)
  })

  it('caps the outputs and says so', () => {
    const payload = parse(evaluateJq(jq, text, '.xbrlModel.facts[]'))
    expect(payload.result_count).toBe(526)
    expect(payload.results).toHaveLength(200)
    expect(payload.note).toBe('showing 200 of 526 results; select more narrowly')
  })

  it('refuses a program that reads the environment', () => {
    expect(isErrorPayload(evaluateJq(jq, text, '$ENV'))).toBe(true)
    expect(isErrorPayload(evaluateJq(jq, text, 'env | keys'))).toBe(true)
    // `env` as a field name is fine.
    expect(isErrorPayload(evaluateJq(jq, text, '.xbrlModel.env'))).toBe(false)
  })
})
