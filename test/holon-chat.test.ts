import type { Store } from 'n3'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  describeReport,
  exampleQueries,
  PREFIX_BLOCK,
  reportSamples,
} from '../src/ai/describeReport'
import { buildStore } from '../src/ai/rdf'
import { runSparql } from '../src/ai/runSparql'
import { isErrorPayload } from '../src/ai/toolPayload'

// The holon chat backend's two tools over the bundled sample (NVIDIA FY2026
// 10-K): the model is oriented by describe_report from the graph it will
// query, and every example query it is handed actually runs on Comunica.
const here = dirname(fileURLToPath(import.meta.url))
const sample = join(here, '..', 'public', 'samples', '0001045810-26-000021.holon.jsonld')

let store: Store
beforeAll(async () => {
  store = await buildStore(readFileSync(sample, 'utf8'))
}, 60_000)

const parse = (payload: string) =>
  JSON.parse(payload) as {
    columns?: string[]
    row_count?: number
    rows?: Record<string, unknown>[]
    note?: string
    ask?: boolean
    error?: string
  }

describe('describe_report', () => {
  it('describes the graph the chat queries', () => {
    const described = describeReport(store)
    expect(described).toContain('Report: NVIDIA CORP — form 10-K, fiscal year 2026 FY')
    expect(described).toMatch(/rs:Fact ×\d+: .*rs:element ×\d+/)
    expect(described).toMatch(/rs:Association ×\d+: .*link:weight ×\d+/)
    expect(described).toMatch(/us-gaap:\w+ → ".+" \(\d+ facts\)/)
    expect(described).toContain('more concepts — find one by label with example query 1.')
    expect(described).toMatch(/\d{4}-\d{2}-\d{2} → \d{4}-\d{2}-\d{2} \(annual\): \d+ facts/)
    expect(described).toMatch(/iso4217:USD: \d+ facts/)
    for (const [, query] of exampleQueries(reportSamples(store))) expect(described).toContain(query)
  })
})

describe('run_sparql', () => {
  it('runs every example query the model is handed', async () => {
    for (const [why, query] of exampleQueries(reportSamples(store))) {
      const payload = await runSparql(store, `${PREFIX_BLOCK}\n${query}`)
      expect(isErrorPayload(payload), why).toBe(false)
      // Derived from this graph, so each one must also FIND something — an
      // example that returns nothing reads as a broken graph, not a pattern.
      expect(parse(payload).row_count, why).toBeGreaterThan(0)
    }
  }, 60_000)

  it('reads the consolidated total of a concept by its qname literal', async () => {
    const payload = parse(
      await runSparql(
        store,
        `${PREFIX_BLOCK}
SELECT ?value ?instant WHERE {
  ?f a rs:Fact ; rs:element ?el ; rs:period ?p ; rs:numericValue ?value .
  ?el rs:internalId "us-gaap:Assets" .
  ?p xbrli:instant ?instant .
  FILTER NOT EXISTS { ?f rs:dimension ?d }
} ORDER BY DESC(?instant)`
      )
    )
    expect(payload.error).toBeUndefined()
    expect(payload.columns).toEqual(['value', 'instant'])
    expect(payload.row_count).toBeGreaterThan(0)
    expect(typeof payload.rows?.[0].value).toBe('number')
    expect(payload.rows?.[0].instant).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('compacts IRIs in the rows', async () => {
    const payload = parse(
      await runSparql(store, `${PREFIX_BLOCK}\nSELECT ?m WHERE { ?u a rs:Unit ; xbrli:measure ?m }`)
    )
    expect(payload.rows?.map((r) => r.m)).toContain('iso4217:USD')
  })

  it('answers ASK', async () => {
    expect(parse(await runSparql(store, `${PREFIX_BLOCK}\nASK { ?f a rs:Fact }`)).ask).toBe(true)
  })

  it('notes an empty result so it is not read as a value', async () => {
    const payload = parse(
      await runSparql(
        store,
        `${PREFIX_BLOCK}\nSELECT ?v WHERE { ?f rs:element ?el ; rs:numericValue ?v . ?el rs:internalId "us-gaap:NoSuchConcept" }`
      )
    )
    expect(payload.row_count).toBe(0)
    expect(payload.note).toMatch(/^0 rows/)
  })

  it('returns a SPARQL error the model can read and fix', async () => {
    const payload = await runSparql(store, `${PREFIX_BLOCK}\nSELECT ?v WHERE { ?f rs:element `)
    expect(isErrorPayload(payload)).toBe(true)
    expect(parse(payload).error).toMatch(/^SPARQL error: /)
  })

  it('refuses anything but SELECT or ASK', async () => {
    const payload = await runSparql(store, 'INSERT DATA { <a> <b> <c> }')
    expect(parse(payload).error).toBe('Only SELECT or ASK queries are allowed.')
  })
})
