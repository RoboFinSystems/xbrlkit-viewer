/**
 * The code the Python page shows. It goes through `FilingSession`, which
 * `xbrlkit.serve` declares as API (RoboSystems builds on it), rather than the
 * Arelle-level `load_model` / `to_xbrl_model` pair, so the page names the
 * surface least likely to move. Checked against the published package with
 * no extras: `serve`'s session needs none, only its server does.
 */
export const PY_INSTALL = `pip install xbrlkit`

/** Load a filing the way `view` and `load_filing` resolve one. */
export const PY_LOAD = `from xbrlkit.serve import FilingSession

session = FilingSession()
filing = session.load("NVDA")  # "NVDA 10-Q", "cik:accession", "lei:…", or a path
model = filing.model           # entity, filing, facts, networks
print(model.entity.name, model.filing.form, len(model.facts))`

/** Project the parsed model. */
export const PY_SERIALIZE = `from xbrlkit.serialize import to_holon, to_tavi_report

holon = to_holon(model)             # holon.jsonld, as a string
tavi, gaps = to_tavi_report(model)  # the TAVI model, and what it could not carry
session.close()`

/** Query a holon in memory. */
export const PY_QUERY = `from xbrlkit.query import fact_grid, load_holon

graph = load_holon("nvda.holon.jsonld")
for row in fact_grid(graph, elements=["us-gaap:Assets"], period_type="instant"):
    print(row.end_date, row.qname, row.value)`
