# xbrlkit viewer

This is [xbrlkit.com](https://xbrlkit.com), the browser side of [xbrlkit](https://github.com/RoboFinSystems/xbrlkit). Its main function is the viewer: a static, client-side renderer for `holon.jsonld` and `tavi.json` financial reports — the analog of Arelle's `ixbrl-viewer`. A holon is a portable RDF artifact and a Tavi model is compiled JSON, not self-rendering HTML, so the viewer reconstructs the financial statements from the document and layers on interactive inspection, in-browser query, and AI analysis. No sign-up and no backend — search a company or open a file and go. The site's wordmark is plain `xbrlkit`, and it has three lanes: `/` opens the SEC lane (any listed filer's filings, no file needed), `/file` opens a report you hold, and `/mcp` is the page on connecting an MCP client.

**Live at <https://xbrlkit.com>.** From the command line, `uvx xbrlkit view NVDA` renders a filing here without downloading anything by hand. The viewer is a RoboSystems project; the earlier `holon.robosystems.ai` address keeps working as an alias.

- **SEC** (`/`, the landing): Search any listed filer by ticker or name, or start from an example ticker, and open one of its filings — every 10-K, 10-Q, 20-F and 40-F since 2024 — straight from the RoboSystems public data CDN, where each filing sits as `tavi.json` and `holon.jsonld`. Same renderer, same in-browser chat; no key and no sign-up.
- **File** (`/file`): Open a local `holon.jsonld` or `tavi.json` (the same filing as a Project Tavi compiled model) and render the full report — offline, no API key, no backend, no network call. A report on the web opens by link: `/?url=https://…/holon.jsonld` (or `…/tavi.json`) opens it in this lane. `xbrlkit view` and its MCP `view_filing` tool open the same thing at `/view?url=…`, a second name for the apex page that lets the analytics count those opens apart from web links. Both links stay for good: the SEC catalog and earlier xbrlkit releases write `/?url=`, newer releases write `/view?url=` (the host must allow cross-origin reads; the RoboSystems public data CDN does, and so does `xbrlkit view`'s loopback server). Try it locally with `npm run preview` — the dev server cannot serve a `?url=` link, Vite reserves that query for asset imports.
- **MCP** (`/mcp`): <https://xbrlkit.com/mcp> shows how to connect Claude, Cursor, VS Code or Claude Code to `xbrlkit serve`, the local MCP server in the package behind this viewer — client-launched over stdio or pointed at the loopback URL, nothing hosted. The page is the recipe and links the package's [serve README](https://github.com/RoboFinSystems/xbrlkit/blob/main/xbrlkit/serve/README.md) for the rest.
- **Statement Rendering**: Reconstructs the complete report — balance sheet, income statement, cash flow, equity, and every disclosure section — from the holon's scene / boundary / projection named graphs, with a table-of-contents sidebar for navigation.
- **Dimensional Facts & Disclosures**: Renders dimensional breakdowns (segments and other axes) and text-block note disclosures alongside the numeric statements, at full fidelity.
- **Fact Inspection**: Inspect any fact — its element, period, unit, and the calculation rule it participates in — directly in the statement tables.
- **AI Analysis**: Ask questions of the loaded report in natural language. A Claude-powered agent answers by querying the report in your browser (MCP-style tools) — SPARQL over a holon's RDF, jq over a Tavi model's JSON — so responses are grounded in the report's actual facts. The two hand-offs are the same shape (a describe tool, then one query tool), so the report's representation is the only thing that differs.
- **One-Click Summary**: Generate an AI narrative overview of the report on demand.
- **Voice**: Have summaries and answers read aloud via ElevenLabs text-to-speech, with a configurable voice and quality preset — the same `eleven_v3` house setting the content-machine narrations ship with, or Turbo when you would rather it start speaking sooner.
- **In-Browser Query Engines**: A Comunica SPARQL engine runs client-side over a holon's RDF, and jq (compiled to WebAssembly, in a Web Worker with a wall-clock limit) over a Tavi model — both power the AI's query tool with no server round-trip.
- **Bring-Your-Own Keys**: Anthropic and ElevenLabs API keys are entered in a keys drawer and persisted only in your browser — never sent to an app backend (there isn't one).

## Quick Start

```bash
npm install      # Install dependencies
npm run dev      # Start the dev server (Vite, default http://localhost:5173)
```

The dev server opens on the SEC lane; `/file` takes the bundled sample report or your own `holon.jsonld` or `tavi.json`. Build either from any SEC filing with [`xbrlkit`](https://github.com/RoboFinSystems/xbrlkit), or skip the file entirely: `uvx xbrlkit view NVDA` serves a filing from your machine and opens it in the hosted viewer.

### Configuration

No lane needs configuration. **SEC Mode** reads the filer catalog and the report files from the RoboSystems public data CDN (`https://public.robosystems.ai`) directly from the browser. To point it at a staging CDN or a local bucket, copy the env template and set the URL:

```bash
cp .env.example .env
# VITE_FILINGS_CDN_URL=https://public.robosystems.ai
```

**Analytics.** A build with `VITE_CF_ANALYTICS_TOKEN` set appends the [Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/) beacon to every page. It is cookieless and counts page views and referrers; it never sees a report, a query or a key. Builds without the token, local and fork builds included, carry no beacon.

## Development Commands

### Core Development

```bash
npm run dev              # Start the Vite dev server
npm run build            # Production build → dist/ (pure static files)
npm run preview          # Preview the production build locally
```

### Testing

```bash
npm run test:all         # format:check + lint + typecheck + test + build (the CI gate)
npm run test             # Run the Vitest test suite
npm run test:watch       # Vitest in watch mode
```

### Code Quality

```bash
npm run lint             # ESLint validation
npm run lint:fix         # Auto-fix linting issues
npm run format           # Prettier code formatting
npm run format:check     # Check formatting compliance
npm run typecheck        # TypeScript type checking
```

### SDLC Commands

```bash
npm run feature:create   # Create a feature branch
```

### Prerequisites

#### System Requirements

- Node.js 24+ (LTS)
- npm
- Modern browser (Chrome, Firefox, Safari, Edge)

#### API Keys (bring-your-own, optional)

Keys are entered in the app's keys drawer and stored only in your browser.

- **Viewing needs none** — the SEC and File lanes both work without a key.
- **Anthropic API key** — for AI analysis and summaries
- **ElevenLabs API key** ([get one](https://try.elevenlabs.io/v9z3wzm97gk3)) — for voice / read-aloud

#### Deployment Requirements

- Fork this repo
- AWS account with IAM Identity Center (SSO)
- S3 + CloudFront for static hosting, provisioned via CloudFormation
- Custom domains are optional, from two repo variables: `VIEWER_DOMAIN` (the canonical name, in a public Route53 hosted zone; an apex domain also gets its `www.` form, redirected to it at the edge) and `VIEWER_LEGACY_DOMAIN` (an earlier name, served as an alias of the same distribution — never redirected, because a published `xbrlkit view` allows only the origin it was built with to read the report it serves)
- Optional: a `CF_ANALYTICS_TOKEN` repo variable holding a Cloudflare Web Analytics site token; the deploy passes it to the build, and without it the site carries no beacon
- A `production` GitHub environment on the repo (required reviewer; deployment refs `main`, `release/*`): the deploy workflow's gate job binds it, so every production deploy pauses for approval

## Architecture

**Application Layer:**

- Vite + React 19 + TypeScript single-page app
- [`@robosystems/report-components`](https://github.com/RoboFinSystems/robosystems-report-components) — the source-agnostic rendering library shared with the RoboLedger app and others; this repo is the shell around it
- N3.js quad store + Comunica for in-browser RDF and SPARQL; jq-wasm (in a Web Worker) for in-browser jq over Tavi models
- Anthropic SDK for AI; ElevenLabs for voice
- The RoboSystems public data CDN for the SEC lane: the filer catalog and each filing's `tavi.json` / `holon.jsonld`, read with plain `fetch`
- Three lanes without a router: the lane comes from the address (`src/pages/route.ts`), and each lane's title, description, canonical and share text come from one table (`src/pages/routeMeta.ts`)

**Rendering:**

The render logic is not in this app — it lives in `@robosystems/report-components`, along with the `holon.jsonld` and `tavi.json` parsers. The viewer supplies the UI shell around them: file-drop and catalog-browse UX, fact inspection, chat, voice, and branding.

**Infrastructure:**

- Builds to pure static files — no backend at runtime. The build writes `index.html` for the SEC lane plus `file/index.html` and `mcp/index.html`, the same page with that lane's head, so crawlers and link previews read each lane's own meta without JavaScript
- A CloudFront Function maps `/file` and `/mcp` to those pages and `/view` to the apex page (and redirects `www.` to the apex); every other path is answered with the apex page
- The share card `public/og.png` is rendered from `src/branding/og-card.html` with headless Chrome; the command is at the top of that file
- Hosted on AWS S3 + CloudFront
- CloudFormation-managed; deployed via GitHub Actions

## CI/CD

- **`deploy.yml`**: Static-site deploy to S3 + CloudFront (manual dispatch, approval-gated by the `production` environment)
- **`test.yml`**: Automated testing on pull requests

## Support

- [Issues](https://github.com/RoboFinSystems/xbrlkit-viewer/issues)
- [Documentation](https://robosystems.ai/docs/technical)
- [Discussions](https://github.com/orgs/RoboFinSystems/discussions)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

MIT © 2026 RFS LLC
