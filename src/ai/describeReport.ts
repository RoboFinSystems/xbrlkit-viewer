/**
 * The `describe_report` tool payload — the holon's vocabulary, the node shapes
 * computed from the graph, what this report contains, and working SPARQL to
 * start from. Brought to parity with filing-ladder's rung 7c hand-off
 * (`representations/holon.py`), so the holon and Tavi backends give the model
 * the same kind of orientation and differ only in data model and query
 * language.
 *
 * Everything here is read from the N3 store the chat queries — not from the
 * NormalizedReport the renderer uses — so what the model is told is what its
 * queries will see. In particular concepts are named by their rs:internalId
 * (the qname literal): a filer's own concepts (`nvda:…`) have no PREFIX the
 * model could write, and the literal sidesteps that.
 */
import { DataFactory, type NamedNode, type Store, type Term } from 'n3'

const { namedNode } = DataFactory

export const PREFIXES: Record<string, string> = {
  rs: 'https://robosystems.ai/vocab/',
  skos: 'http://www.w3.org/2004/02/skos/core#',
  xbrli: 'http://www.xbrl.org/2003/instance#',
  xlink: 'http://www.w3.org/1999/xlink#',
  link: 'http://www.xbrl.org/2003/linkbase#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  'us-gaap': 'http://fasb.org/us-gaap/',
  dei: 'http://xbrl.sec.gov/dei/',
  srt: 'http://fasb.org/srt/',
  'rs-gaap': 'https://robosystems.ai/taxonomy/rs-gaap/v1/',
  iso4217: 'http://www.xbrl.org/2003/iso4217#',
  concept: 'https://robosystems.ai/concept/',
}

export const PREFIX_BLOCK = Object.entries(PREFIXES)
  .map(([prefix, iri]) => `PREFIX ${prefix}: <${iri}>`)
  .join('\n')

const RDF_TYPE = namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
const rs = (local: string): NamedNode => namedNode(PREFIXES.rs + local)
const xbrli = (local: string): NamedNode => namedNode(PREFIXES.xbrli + local)
const PREF_LABEL = namedNode(PREFIXES.skos + 'prefLabel')

/** Compact an IRI with the prefixes above, else keep it angle-bracketed. */
export function compact(iri: string): string {
  for (const [prefix, base] of Object.entries(PREFIXES)) {
    if (iri.startsWith(base)) return `${prefix}:${iri.slice(base.length)}`
  }
  return `<${iri}>`
}

/**
 * Working SPARQL patterns for a holon, each with the why — written against the
 * concepts and period this report actually carries (see `reportSamples`).
 * Prefixed at use.
 */
export function exampleQueries(samples: ReportSamples): ReadonlyArray<readonly [string, string]> {
  const durationTypeClause = samples.hasDurationType
    ? ' Two facts can share an end date (the annual and the fourth quarter); rs:durationType and the start date tell them apart.'
    : ''
  const examples: Array<readonly [string, string]> = [
    [
      'Find a concept by its label (the qname is what every other query needs).',
      `SELECT ?qname ?label (COUNT(?f) AS ?facts) WHERE {
  ?el a rs:Element ; rs:internalId ?qname ; skos:prefLabel ?label .
  OPTIONAL { ?f rs:element ?el }
  FILTER (CONTAINS(LCASE(?label), "${samples.labelTerm}"))
} GROUP BY ?qname ?label ORDER BY DESC(?facts)`,
    ],
    [
      `Consolidated (undimensioned) values of one concept.${durationTypeClause}`,
      `SELECT ?qname ?label ?value ?start ?end ?instant ?ptype ?measure WHERE {
  ?f a rs:Fact ; rs:element ?el ; rs:period ?p ; rs:numericValue ?value .
  ?el rs:internalId ?qname .
  OPTIONAL { ?el skos:prefLabel ?label }
  ?p xbrli:periodType ?ptype .
  OPTIONAL { ?p xbrli:startDate ?start } OPTIONAL { ?p xbrli:endDate ?end }
  OPTIONAL { ?p xbrli:instant ?instant }
  OPTIONAL { ?f rs:unit ?u . ?u xbrli:measure ?measure }
  FILTER NOT EXISTS { ?f rs:dimension ?d }
  FILTER (?qname = "${samples.concept}")
} ORDER BY DESC(?end) DESC(?instant)`,
    ],
  ]
  // Only offered when this report has a breakdown to find. On a report whose
  // facts are all consolidated the pattern is sound but returns nothing, and an
  // example that returns nothing reads as a broken graph.
  if (samples.dimensional) {
    examples.push([
      'The dimensional breakdown of a concept (segments, members) for one period end.',
      `SELECT ?axis ?member ?value ?start ?end WHERE {
  ?f a rs:Fact ; rs:element ?el ; rs:period ?p ; rs:numericValue ?value ; rs:dimension ?d .
  ?el rs:internalId "${samples.dimensional.concept}" .
  ?d rs:axis ?axis ; rs:member ?member .
  ?p xbrli:endDate ?end . OPTIONAL { ?p xbrli:startDate ?start }
  FILTER (STR(?end) = "${samples.dimensional.periodEnd}")
} ORDER BY ?axis ?member`,
    ])
  }
  examples.push(
    [
      'What sums to a concept: its calculation children with weights (the taxonomy is in the graph).',
      `SELECT ?childQname ?childLabel ?weight ?order WHERE {
  ?a rs:associationType "calculation" ; xlink:from ?parent ; xlink:to ?child ;
     link:weight ?weight ; link:order ?order .
  ?parent rs:internalId "${samples.subtotal}" .
  ?child rs:internalId ?childQname . OPTIONAL { ?child skos:prefLabel ?childLabel }
} ORDER BY ?order`,
    ],
    [
      'Which statements or notes a concept appears on (presentation structures), and its label there.',
      `SELECT ?structureLabel ?preferredLabel WHERE {
  ?s a rs:Structure ; skos:prefLabel ?structureLabel ; rs:hasAssociation ?a .
  ?a rs:associationType "presentation" ; xlink:to ?el .
  OPTIONAL { ?a rs:preferredLabel ?preferredLabel }
  ?el rs:internalId "${samples.presented}" .
}`,
    ]
  )
  return examples
}

const CONCEPTS_LISTED = 40

/**
 * The concepts, period and subtotal the example queries are written against.
 *
 * Read from the report rather than hardcoded. A filing's concepts are
 * `us-gaap:`, a RoboLedger report's are `rs-gaap:` plus the tenant's own, so a
 * fixed `us-gaap:Revenues` made every example return nothing on a ledger
 * report — under a header telling the model these are working patterns to start
 * from. Each pick is the busiest of its kind, so the query it lands in returns
 * rows on the report the model actually has.
 */
export interface ReportSamples {
  /** The most-reported concept's QName literal (`rs:internalId`). */
  concept: string
  /** A substring of a real label, for the find-by-label example. */
  labelTerm: string
  /** A concept that is the parent of calculation arcs, or the concept. */
  subtotal: string
  /** A concept carried by a presentation structure, or the concept. */
  presented: string
  /**
   * A concept with a dimensional fact, and an `xbrli:endDate` that fact's
   * period carries — the breakdown example needs BOTH to return rows, and the
   * busiest concept overall need not have a breakdown at all. Empty when the
   * report has no dimensional fact on a duration period.
   */
  dimensional: { concept: string; periodEnd: string } | null
  /** True when some period carries `rs:durationType`. */
  hasDurationType: boolean
}

/** Read the example queries' subjects out of the graph they will run against. */
export function reportSamples(store: Store): ReportSamples {
  const factCounts = tally(
    store.getQuads(null, rs('element'), null, null).map((q) => q.object.value)
  )
  const busiest = mostCommon(factCounts)[0]?.[0]
  const internalId = (iri: string | undefined): string =>
    (iri ? first(store, namedNode(iri), rs('internalId')) : undefined) ?? ''
  const concept = internalId(busiest) || 'rs-gaap:Assets'

  const label = busiest ? (first(store, namedNode(busiest), PREF_LABEL) ?? '') : ''
  // A distinctive fragment of a real label: the longest word in it, lowercased,
  // so CONTAINS(LCASE(?label), …) matches at least that concept.
  const longestWord = label
    .split(/[^A-Za-z]+/)
    .filter((w) => w.length > 3)
    .sort((a, b) => b.length - a.length)[0]
  const labelTerm = (longestWord ?? label).toLowerCase()

  const calcParent = store
    .getQuads(null, namedNode(PREFIXES.rs + 'associationType'), null, null)
    .filter((q) => q.object.value === 'calculation')
    .map((q) => store.getObjects(q.subject, namedNode(PREFIXES.xlink + 'from'), null)[0])
    .find((o) => o && internalId(o.value))
  const subtotal = internalId(calcParent?.value) || concept

  const presented = (() => {
    for (const structure of store.getSubjects(RDF_TYPE, rs('Structure'), null)) {
      for (const assoc of store.getObjects(structure, rs('hasAssociation'), null)) {
        const to = store.getObjects(assoc, namedNode(PREFIXES.xlink + 'to'), null)[0]
        const id = internalId(to?.value)
        if (id) return id
      }
    }
    return concept
  })()

  // The breakdown example filters on xbrli:endDate, so the pair has to come
  // from one dimensional fact on a duration period — picking the busiest
  // concept and the latest end date independently pairs them wrongly and the
  // example returns nothing.
  let dimensional: { concept: string; periodEnd: string } | null = null
  for (const quad of store.getQuads(null, rs('dimension'), null, null)) {
    // The example also requires a numeric value and an explicit member: a
    // vesting-period fact is dimensional but has neither, and picking one gave
    // an example that returned nothing on the NVDA sample.
    if (!first(store, quad.subject, rs('numericValue'))) continue
    if (!first(store, quad.object, rs('member'))) continue
    const element = store.getObjects(quad.subject, rs('element'), null)[0]
    const period = store.getObjects(quad.subject, rs('period'), null)[0]
    const id = internalId(element?.value)
    const end = period ? first(store, period, xbrli('endDate')) : undefined
    if (id && end) {
      dimensional = { concept: id, periodEnd: end }
      break
    }
  }

  return {
    concept,
    labelTerm,
    subtotal,
    presented,
    dimensional,
    hasDurationType: store.countQuads(null, rs('durationType'), null, null) > 0,
  }
}

export function describeReport(store: Store): string {
  const samples = reportSamples(store)
  const examples = exampleQueries(samples)
    .map(([why, query]) => `# ${why}\n${PREFIX_BLOCK}\n${query}`)
    .join('\n\n')

  // Only claimed when the graph has them: a RoboLedger report's periods carry no
  // rs:durationType, and a report with no dimensional facts has no breakdown to
  // look for. Promising either sends the model after something that is not there.
  const durationType = samples.hasDurationType
    ? ', plus rs:durationType (annual | quarterly | other)'
    : ''
  const dimensions = samples.dimensional
    ? `A fact with any rs:dimension is a breakdown (segment, member); the
consolidated total is the fact WITHOUT rs:dimension — use FILTER NOT EXISTS { ?f rs:dimension ?d }.`
    : `No fact in this report carries rs:dimension: every value is consolidated, and there is no
segment or member breakdown to query.`

  return `This is ONE financial report as RDF (an XBRL "holon"), queryable with read-only SPARQL 1.1.
Always include these PREFIX lines:

${PREFIX_BLOCK}

${reportLine(store)}
Node shapes, computed from this graph (type ×nodes: predicate ×nodes carrying it):
${nodeShapes(store)}

Reading a value: a rs:Fact has rs:element (the concept), rs:period, rs:unit, and rs:numericValue
or rs:stringValue. ${dimensions}
Concepts are identified by rs:internalId (the qname, e.g. "${samples.concept}"); join
skos:prefLabel for the human label. Periods carry xbrli:startDate / xbrli:endDate (duration) or
xbrli:instant${durationType}. Presentation, calculation and
definition relationships are rs:Association nodes (xlink:from, xlink:to, link:order, link:weight,
rs:associationType) grouped under rs:Structure nodes — the taxonomy is in this graph.

Most-reported concepts in this report (qname → label; the full set is found by query):
${conceptsPresent(store)}

Periods present:
${periodsPresent(store)}

Units present:
${unitsPresent(store)}

Example queries (working patterns for this graph — start from these):

${examples}`
}

function tally(values: Iterable<string>): Map<string, number> {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return counts
}

/** Entries by descending count, ties by key. */
function mostCommon(counts: Map<string, number>): [string, number][] {
  return [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)
  )
}

/** The first object of (subject, predicate), as a string — a literal's value or an IRI. */
function first(store: Store, subject: Term, predicate: NamedNode): string | undefined {
  const object = store.getObjects(subject, predicate, null)[0]
  return object?.value
}

/**
 * What this report is, from whichever metadata it carries.
 *
 * A filing has a form, a fiscal-year focus and an accession number. A
 * RoboLedger report has none of those — it carries rs:mode, rs:reportingStyle
 * and its own report id — so naming the SEC fields unconditionally printed
 * "form ?, fiscal year ?" and called the report id an accession. Each field is
 * named only when present.
 */
function reportLine(store: Store): string {
  const report = store.getSubjects(RDF_TYPE, rs('Report'), null)[0]
  if (!report) return ''
  const entity = store.getObjects(report, rs('entity'), null)[0]
  const name =
    (entity ? first(store, entity, PREF_LABEL) : undefined) ??
    (entity ? first(store, entity, rs('legalName')) : undefined)
  const form = first(store, report, rs('form'))
  const fy = first(store, report, rs('fiscalYearFocus'))
  const fp = first(store, report, rs('fiscalPeriodFocus'))
  const id = first(store, report, rs('accessionNumber'))
  const parts = [
    form ? `form ${form}` : null,
    fy ? `fiscal year ${fy}${fp ? ` ${fp}` : ''}` : null,
    first(store, report, rs('reportingStyle'))
      ? `reporting style ${first(store, report, rs('reportingStyle'))}`
      : null,
    first(store, report, rs('filingDate'))
      ? `filed ${first(store, report, rs('filingDate'))}`
      : null,
    // A filing's is an SEC accession number; a ledger report's is its own id.
    id ? `${form ? 'accession' : 'report'} ${id}` : null,
  ].filter(Boolean)
  return `Report: ${name ?? '?'}${parts.length ? ` — ${parts.join(', ')}` : ''}\n`
}

/**
 * The node shape of each rdf:type, counted per NODE.
 *
 * A holon partitions one report across named graphs (#scene / #boundary /
 * #projection) and repeats a node in more than one of them — every concept with
 * a fact appears in both #scene and #projection. Walking type quads and then
 * fetching each subject's quads across all graphs therefore counted such a node
 * once per (type quad x graph): 42 shared concepts out of 98 reported as
 * "skos:prefLabel x224". Distinct subjects per type, and each (subject,
 * predicate) once, so the census matches the report.
 */
function nodeShapes(store: Store): string {
  const subjectsByType = new Map<string, Set<string>>()
  for (const typed of store.getQuads(null, RDF_TYPE, null, null)) {
    const subjects = subjectsByType.get(typed.object.value) ?? new Set<string>()
    subjectsByType.set(typed.object.value, subjects)
    subjects.add(typed.subject.value)
  }
  return [...subjectsByType.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([type, subjects]) => {
      const predicates = new Map<string, number>()
      for (const subject of subjects) {
        const own = new Set<string>()
        for (const quad of store.getQuads(namedNode(subject), null, null, null)) {
          if (quad.predicate.equals(RDF_TYPE)) continue
          own.add(quad.predicate.value)
        }
        for (const predicate of own) {
          predicates.set(predicate, (predicates.get(predicate) ?? 0) + 1)
        }
      }
      const inner = mostCommon(predicates)
        .map(([predicate, n]) => `${compact(predicate)} ×${n}`)
        .join(', ')
      return `  ${compact(type)} ×${subjects.size}: ${inner}`
    })
    .join('\n')
}

function conceptsPresent(store: Store): string {
  // rs:element hangs off facts only, so its objects counted are facts per concept.
  const counts = tally(store.getQuads(null, rs('element'), null, null).map((q) => q.object.value))
  const rows = mostCommon(counts).map(([iri, n]) => {
    const element = namedNode(iri)
    return {
      qname: first(store, element, rs('internalId')) ?? compact(iri),
      label: first(store, element, PREF_LABEL) ?? '',
      n,
    }
  })
  const shown = rows
    .slice(0, CONCEPTS_LISTED)
    .map((r) => `  - ${r.qname} → "${r.label}" (${r.n} facts)`)
  if (rows.length > CONCEPTS_LISTED) {
    shown.push(
      `  … and ${rows.length - CONCEPTS_LISTED} more concepts — find one by label with example query 1.`
    )
  }
  return shown.join('\n')
}

function periodsPresent(store: Store): string {
  const rows = store.getSubjects(RDF_TYPE, rs('Period'), null).map((period) => {
    const instant = first(store, period, xbrli('instant'))
    const start = first(store, period, xbrli('startDate'))
    const end = first(store, period, xbrli('endDate'))
    const dtype = first(store, period, rs('durationType'))
    return {
      end: instant ?? end ?? '',
      start: start ?? '',
      when: instant ? `${instant} (instant)` : `${start} → ${end} (${dtype ?? 'duration'})`,
      n: store.countQuads(null, rs('period'), period, null),
    }
  })
  return rows
    .sort((a, b) => b.end.localeCompare(a.end) || b.start.localeCompare(a.start))
    .map((r) => `  - ${r.when}: ${r.n} facts`)
    .join('\n')
}

function unitsPresent(store: Store): string {
  const rows = store.getSubjects(RDF_TYPE, rs('Unit'), null).map((unit) => {
    const measure = first(store, unit, xbrli('measure'))
    return {
      measure: measure ? compact(measure) : '?',
      n: store.countQuads(null, rs('unit'), unit, null),
    }
  })
  return rows
    .sort((a, b) => b.n - a.n)
    .map((r) => `  - ${r.measure}: ${r.n} facts`)
    .join('\n')
}
