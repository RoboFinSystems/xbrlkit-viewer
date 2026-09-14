import { buildPivots } from '@robosystems/report-components'
import { parseReportDocument } from '@robosystems/report-components/adapters'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Every other fixture here is an SEC filing, and a filing names its registrant
// in a dei fact. A RoboLedger report has no dei facts at all: the entity's name
// rides an `xbrl:label` (Tavi) / `rs:legalName` (holon) instead. The viewer
// shipped for three patches naming every ledger report `entity_kg1a09d9…`
// because the pinned library predated reading those — a defect no SEC fixture
// could show. This is the ledger-shaped door, so it can't come back.
const here = dirname(fileURLToPath(import.meta.url))
const fixture = (name: string) => readFileSync(join(here, 'fixtures', name), 'utf8')

describe('viewer ↔ library wiring (Mode A, a RoboLedger report)', () => {
  it('names the entity from its label when no registrant fact exists', async () => {
    const { format, report } = await parseReportDocument(fixture('roboledger-demo.tavi.json'))
    expect(format).toBe('tavi')
    expect(report.entity?.name).toBe('Cascade Advisory Group LLC')
    expect(report.entity?.legalName).toBe('Cascade Advisory Group LLC')
  })

  it('pivots the four primary statements with labelled rows', async () => {
    const { report } = await parseReportDocument(fixture('roboledger-demo.tavi.json'))
    const statements = buildPivots(report).filter((p) => p.kind === 'Statement')
    expect(statements.map((s) => s.title)).toEqual([
      'Balance Sheet',
      'Income Statement',
      'Cash Flow Statement',
      'Statement of Changes in Equity',
    ])
    // The label fix (robosystems #1391/#1394) carries a concept's wording into
    // the projection; before it every row read as its bare QName.
    const rows = statements.flatMap((s) => s.rows)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => !/^[a-z-]+:[A-Za-z]/.test(r.label ?? r.element.label))).toBe(true)
  })

  it('does not repeat a section title as its own first row', async () => {
    // rs-gaap gives the income statement a root `IncomeStatementAbstract` and
    // the other three primaries none, so every RoboLedger report printed
    // "Income Statement" directly under the heading "Income Statement".
    // report-components 0.6.0 hides a root abstract that only restates the
    // title, which is the behavior this pin is here for.
    const { report } = await parseReportDocument(fixture('roboledger-demo.tavi.json'))
    for (const table of buildPivots(report)) {
      const echoes = table.rows.filter(
        (r) => r.header && (r.label ?? r.element.label) === table.title
      )
      expect(echoes, table.title).toHaveLength(0)
    }
  })
})
