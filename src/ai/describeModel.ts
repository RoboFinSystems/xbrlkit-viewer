/**
 * The `describe_model` tool payload — how a Tavi compiled model is laid out,
 * what this one contains, and working jq programs to start from. The port of
 * filing-ladder's rung 5c hand-off (`representations/tavi.py`): the same
 * describe-then-one-query shape `describe_report` gives a holon, so the two
 * backends differ only in data model and query language.
 *
 * Tavi (XBRL International, PWD 2026-09-01, previously "OIM Taxonomy") is one
 * JSON document carrying both the facts and the taxonomy that gives them
 * meaning — labels, presentation and calculation networks, cubes — so unlike a
 * holon there is no graph to rebuild: the model queries the document as it is.
 */
import type { TaviDocument } from '@robosystems/report-components/adapters'

type TaviModel = NonNullable<TaviDocument['xbrlModel']>
type TaviFact = NonNullable<TaviModel['facts']>[number]

const CORE_DIMENSIONS = new Set([
  'xbrl:concept',
  'xbrl:period',
  'xbrl:entity',
  'xbrl:unit',
  'xbrl:language',
])

const CONCEPTS_LISTED = 40
const GROUPS_LISTED = 80
const AXES_LISTED = 25

/**
 * The concepts, period and group the example programs are written against.
 *
 * Read from the document rather than hardcoded. A filing's concepts are
 * `us-gaap:`, a RoboLedger report's are `rs-gaap:` plus the tenant's own, and
 * its group URIs are nothing like an SEC role — so a fixed `us-gaap:Revenues`
 * and a `test("ConsolidatedStatementofIncome")` made those programs return
 * nothing, under a header telling the model they are working patterns to start
 * from.
 */
export interface ModelSamples {
  /** The most-reported concept's QName. */
  concept: string
  /** A substring of a real standard label, for the find-by-label program. */
  labelTerm: string
  /** A concept that is the source of summation-item relationships. */
  subtotal: string
  /** A concept that some parent-child network targets. */
  presented: string
  /** An `xbrl:period` value present on a fact, or ''. */
  period: string
  /** A fragment matching one group's URI, for the statement program. */
  groupUriTerm: string
  /** True when some fact carries a non-core dimension. */
  hasDimensions: boolean
}

/** Read the example programs' subjects out of the document they will run on. */
export function modelSamples(model: TaviModel): ModelSamples {
  const conceptCounts = tally(
    facts(model)
      .map((f) => dimension(f, 'xbrl:concept'))
      .filter((c): c is string => Boolean(c))
  )
  const concept = mostCommon(conceptCounts, 1)[0]?.[0] ?? ''
  const labels = standardLabels(model)
  const longestWord = (labels.get(concept) ?? '')
    .split(/[^A-Za-z]+/)
    .filter((w) => w.length > 3)
    .sort((a, b) => b.length - a.length)[0]

  const summation = (model.networks ?? []).filter(
    (n) => n.relationshipTypeName === 'xbrl:summation-item'
  )
  const subtotal =
    summation
      .flatMap((n) => n.relationships ?? [])
      .find((r) => r.source && r.source !== 'xbrl:rootSource')?.source ?? concept
  const presented =
    (model.networks ?? [])
      .filter((n) => n.relationshipTypeName === 'xbrl:parent-child')
      .flatMap((n) => n.relationships ?? [])
      .find((r) => r.target && r.target !== concept)?.target ?? concept

  const period = facts(model)
    .map((f) => dimension(f, 'xbrl:period'))
    .filter((x): x is string => Boolean(x))
    .sort()
    .pop()

  // A distinctive fragment of a real group URI — its last path segment, which is
  // the role name in both an SEC role and a RoboLedger one.
  const groupUri = (model.groups ?? [])[0]?.groupURI ?? ''
  const hasDimensions = facts(model).some((f) =>
    Object.keys(f.factDimensions ?? {}).some((k) => !CORE_DIMENSIONS.has(k))
  )
  return {
    concept,
    labelTerm: (longestWord ?? labels.get(concept) ?? '').toLowerCase(),
    subtotal,
    presented,
    period: period ?? '',
    groupUriTerm: groupUri.split('/').filter(Boolean).pop() ?? groupUri,
    hasDimensions,
  }
}

/** Working jq programs for an xbrlkit Tavi document, each with the why. */
export function exampleQueries(samples: ModelSamples): ReadonlyArray<readonly [string, string]> {
  const examples: Array<readonly [string, string]> = [
    [
      'Find a concept by its label (the QName is what every other query needs). Labels are free-standing objects pointing at the concept through forObject; xbrl:label is the standard label.',
      `[.xbrlModel.labels[]
  | select(.labelType == "xbrl:label" and (.value | ascii_downcase | contains("${samples.labelTerm}")))
  | {concept: .forObject, label: .value}]`,
    ],
    [
      "Consolidated (undimensioned) values of one concept. A fact's factDimensions carries the core dimensions under xbrl:* keys and every taxonomy axis as a further key, so the consolidated total is the fact with no non-xbrl key. Values are strings: use tonumber.",
      `[.xbrlModel.facts[]
  | select(.factDimensions["xbrl:concept"] == "${samples.concept}")
  | select([.factDimensions | keys[] | select(startswith("xbrl:") | not)] | length == 0)
  | {period: .factDimensions["xbrl:period"], unit: .factDimensions["xbrl:unit"],
     value: (.factValues[0].value | tonumber), decimals: .factValues[0].decimals}]
| sort_by(.period) | reverse`,
    ],
  ]
  // Only offered when this document has a breakdown to find — on an all-
  // consolidated report the program is sound but returns nothing, which reads
  // as a broken document.
  if (samples.hasDimensions) {
    examples.push([
      'The dimensional breakdown of a concept for one period: the non-core keys of factDimensions are the axes, their values the members.',
      `[.xbrlModel.facts[]
  | select(.factDimensions["xbrl:concept"] == "${samples.concept}"
           and .factDimensions["xbrl:period"] == "${samples.period}")
  | {axes: (.factDimensions | with_entries(select(.key | startswith("xbrl:") | not))),
     value: (.factValues[0].value | tonumber)}]`,
    ])
  }
  examples.push(
    [
      'What sums to a concept: its calculation children with weights. Networks hold relationships; xbrl:summation-item networks carry xbrl:weight as a relationship property; a relationship from xbrl:rootSource marks a root.',
      `[.xbrlModel.networks[]
  | select(.relationshipTypeName == "xbrl:summation-item")
  | .relationships[]
  | select(.source == "${samples.subtotal}")
  | {child: .target, order,
     weight: ([.properties[]? | select(.property == "xbrl:weight") | .value] | first)}]`,
    ],
    [
      "Which statements or notes a concept is presented on: presentation networks belong to groups (groupContents), and a group's readable name is its xbrl:label.",
      `(.xbrlModel.labels | map(select(.labelType == "xbrl:label")) | map({(.forObject): .value}) | add) as $lbl
| [.xbrlModel.networks[]
  | select(.relationshipTypeName == "xbrl:parent-child")
  | select(any(.relationships[]; .target == "${samples.presented}"))
  | .name] as $nets
| [.xbrlModel.groupContents[] | select(.forObject as $n | $nets | index($n)) | $lbl[.groupName]]`,
    ],
    [
      'The line items of one statement, in presentation order with the label the statement uses (xbrl:preferredLabel names a label type; fall back to the standard label).',
      `(.xbrlModel.labels | map({(.forObject + "|" + .labelType): .value}) | add) as $lbl
| (.xbrlModel.groups[] | select(.groupURI | test("${samples.groupUriTerm}")) | .name) as $g
| [.xbrlModel.groupContents[] | select(.groupName == $g) | .forObject] as $members
| .xbrlModel.networks[] | select((.name as $n | $members | index($n)) and .relationshipTypeName == "xbrl:parent-child")
| [.relationships[] | select(.source != "xbrl:rootSource")
   | {parent: .source, concept: .target, order,
      label: ($lbl[.target + "|" + (([.properties[]? | select(.property == "xbrl:preferredLabel") | .value] | first) // "xbrl:label")]
              // $lbl[.target + "|xbrl:label"])}]`,
    ]
  )
  return examples
}

export function describeModel(doc: TaviDocument): string {
  const model: TaviModel = doc.xbrlModel ?? {}
  const namespaces = doc.documentInfo?.namespaces ?? {}
  const counts = Object.entries(model)
    .filter((entry): entry is [string, unknown[]] => Array.isArray(entry[1]))
    .map(([key, list]) => `${key} ×${list.length}`)
    .join(', ')
  const prefixes = Object.entries(namespaces)
    .map(([prefix, iri]) => `${prefix} → ${iri}`)
    .join(', ')
  const samples = modelSamples(model)
  const examples = exampleQueries(samples)
    .map(([why, program]) => `# ${why}\n${program}`)
    .join('\n\n')

  return `This is ONE financial report as a Project Tavi compiled model (XBRL International's OIM Taxonomy
Model): a single JSON document holding the facts AND the taxonomy that gives them meaning, queryable
with jq. Every object is addressed by a QName; the prefixes are:
${prefixes}

${entityLine(model)}
Top-level collections under .xbrlModel (${counts}).

Reading a fact (.xbrlModel.facts[]): .factDimensions is a flat map — "xbrl:concept" (the concept
QName), "xbrl:period" (an ISO interval of dateTimes with an EXCLUSIVE end: the 2024 calendar year is
"2024-01-01T00:00:00/2025-01-01T00:00:00", an instant at the close of 2024-12-31 is
"2025-01-01T00:00:00"), "xbrl:entity", "xbrl:unit" (absent for a pure number), "xbrl:language" (text
facts only), plus one further key per taxonomy axis whose value is the member. A fact with any non-xbrl:
key is a breakdown (segment, member); the consolidated total is the fact with NONE — see example 2.
.factValues[0].value is the reported value as a STRING (use tonumber); .decimals is its precision
(-6 = millions; absent = exact). A fact the filing reports as nil has no factValues at all.

Reading the taxonomy: .concepts[] carry name, dataType, periodType and properties (xbrla:balance).
.headings[] are the abstract line items that organize a statement. .labels[] are free-standing:
{forObject, labelType, language, value}; "xbrl:label" is the standard label, "xbrl:terseLabel",
"xbrl:totalLabel", "xbrl:negatedLabel" etc. the others. .networks[] hold relationships
{source, target, order, properties}: relationshipTypeName "xbrl:parent-child" is presentation
(properties may carry xbrl:preferredLabel), "xbrl:summation-item" is calculation (xbrl:weight ±1);
a relationship from "xbrl:rootSource" marks a root. .groups[] are the statements and notes
(groupURI; readable name = the group's xbrl:label); .groupContents[] map a group to its networks and
cubes. .cubes[] / .dimensions[] / .domainNetworks[] / .members[] describe the dimensional tables.

Most-reported concepts (QName → standard label → fact count; the full set is found by example 1):
${conceptsPresent(model)}

Periods present (facts):
${periodsPresent(model)}

Units present:
${unitsPresent(model)}

Taxonomy axes present on facts (axis → distinct members → facts):
${axesPresent(model)}

Groups (statements and notes; group name → label):
${groupsPresent(model)}

Example queries (working jq programs for this document — start from these; the input is the whole
document, so begin with .xbrlModel):

${examples}`
}

const facts = (model: TaviModel): TaviFact[] => model.facts ?? []
const dimension = (fact: TaviFact, key: string): string | undefined => {
  const value = fact.factDimensions?.[key]
  return value === undefined || value === null ? undefined : String(value)
}

function tally(values: Iterable<string>): Map<string, number> {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return counts
}

/** Entries by descending count, ties by key — Python's `most_common`, made deterministic. */
function mostCommon(counts: Map<string, number>, limit = Infinity): [string, number][] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, limit)
}

/**
 * What this report is and whose it is.
 *
 * An entity's SQName is `entity:entity_kg1a09d9…` in a RoboLedger model — its
 * readable name is a free-standing `xbrl:label`, the same place the Tavi adapter
 * reads it from. A filing's registrant has a label too, so preferring it is
 * right either way; the SQName follows in parentheses since queries need it.
 */
function entityLine(model: TaviModel): string {
  const labels = standardLabels(model)
  const entities =
    (model.entities ?? [])
      .map((e) => {
        const label = labels.get(e.name)
        return label ? `${label} (${e.name})` : e.name
      })
      .join(', ') || '?'
  const filed = (model.properties ?? []).find((p) => p.property === 'xbrl:reportFilingDate')?.value
  return `Report: ${model.name ?? '?'} — entity ${entities}${filed ? `, filed ${String(filed)}` : ''}`
}

function standardLabels(model: TaviModel): Map<string, string> {
  const labels = new Map<string, string>()
  for (const label of model.labels ?? []) {
    if (label.labelType === 'xbrl:label' && !labels.has(label.forObject)) {
      labels.set(label.forObject, label.value)
    }
  }
  return labels
}

function conceptsPresent(model: TaviModel): string {
  const counts = tally(
    facts(model)
      .map((f) => dimension(f, 'xbrl:concept'))
      .filter((c): c is string => Boolean(c))
  )
  const labels = standardLabels(model)
  const shown = mostCommon(counts, CONCEPTS_LISTED).map(
    ([qname, n]) => `  - ${qname} → "${labels.get(qname) ?? ''}" (${n} facts)`
  )
  if (counts.size > CONCEPTS_LISTED) {
    shown.push(`  … and ${counts.size - CONCEPTS_LISTED} more concepts.`)
  }
  return shown.join('\n')
}

function periodsPresent(model: TaviModel): string {
  const counts = tally(
    facts(model)
      .map((f) => dimension(f, 'xbrl:period'))
      .filter((p): p is string => Boolean(p))
  )
  // Newest first, by the interval's end (an instant is its own end).
  const end = (period: string) => period.split('/').pop() ?? period
  return [...counts.entries()]
    .sort(([a], [b]) => {
      const byEnd = end(b).localeCompare(end(a))
      return byEnd !== 0 ? byEnd : b.localeCompare(a)
    })
    .map(([period, n]) => `  - ${period}: ${n} facts`)
    .join('\n')
}

function unitsPresent(model: TaviModel): string {
  const counts = tally(
    facts(model)
      .map((f) => dimension(f, 'xbrl:unit'))
      .filter((u): u is string => Boolean(u))
  )
  return mostCommon(counts)
    .map(([unit, n]) => `  - ${unit}: ${n} facts`)
    .join('\n')
}

function axesPresent(model: TaviModel): string {
  const factsByAxis = new Map<string, number>()
  const membersByAxis = new Map<string, Set<string>>()
  for (const fact of facts(model)) {
    for (const [key, value] of Object.entries(fact.factDimensions ?? {})) {
      if (CORE_DIMENSIONS.has(key)) continue
      factsByAxis.set(key, (factsByAxis.get(key) ?? 0) + 1)
      const members = membersByAxis.get(key) ?? new Set<string>()
      members.add(String(value))
      membersByAxis.set(key, members)
    }
  }
  const shown = mostCommon(factsByAxis, AXES_LISTED).map(
    ([axis, n]) => `  - ${axis}: ${membersByAxis.get(axis)?.size ?? 0} members, ${n} facts`
  )
  if (factsByAxis.size > AXES_LISTED) {
    shown.push(`  … and ${factsByAxis.size - AXES_LISTED} more axes.`)
  }
  return shown.join('\n')
}

function groupsPresent(model: TaviModel): string {
  const labels = standardLabels(model)
  const groups = model.groups ?? []
  const shown = groups
    .slice(0, GROUPS_LISTED)
    .map((g) => `  - ${g.name}: ${labels.get(g.name) ?? g.groupURI ?? ''}`)
  if (groups.length > GROUPS_LISTED) {
    shown.push(
      `  … and ${groups.length - GROUPS_LISTED} more groups — find one by its label in .labels[].`
    )
  }
  return shown.join('\n')
}
