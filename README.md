# xbrlkit viewer

**The browser viewer for [xbrlkit](https://github.com/RoboFinSystems/xbrlkit), the XBRL toolkit from [RoboSystems](https://github.com/RoboFinSystems/robosystems), the open-source knowledge graph for finance.** Served at [xbrlkit.com](https://xbrlkit.com): search a public company and read its filing as a rendered report, or open a report file you hold. No sign-up and no backend.

A report arrives as a `holon.jsonld` or a `tavi.json`, which is data, not a page. The viewer rebuilds the financial statements and notes from it in the browser, and lets you inspect any number or ask questions of the report with AI on your own key. From a terminal, `uvx xbrlkit view NVDA` opens a filing here.

## What it does

- **SEC** (`/`): search any listed filer by ticker or name and open one of its filings (every 10-K, 10-Q, 20-F and 40-F since 2024), read from the RoboSystems public data CDN
- **File** (`/file`): open a local `holon.jsonld` or `tavi.json` and render the full report, offline, with no network call
- **Links**: `/?url=https://…/holon.jsonld` opens a report on the web; `xbrlkit view` and the MCP `view_filing` tool open theirs at `/view?url=…`
- **Statements**: the balance sheet, income statement, cash flow, equity and every disclosure section, with a table of contents
- **Dimensions and notes**: segment and other breakdowns, and the text of the notes, beside the numbers
- **Fact inspection**: any number's element, period, unit and the calculation it belongs to
- **AI chat**: ask the report a question; Claude answers by querying the report in your browser, SPARQL over a holon or jq over a Tavi model
- **Summary**: a narrative overview of the report on demand
- **Voice**: summaries and answers read aloud through ElevenLabs
- **Your own keys**: Anthropic and ElevenLabs keys go in a drawer and stay in your browser; viewing needs none
- **MCP, CLI and Python** (`/mcp`, `/cli`, `/python`): how to run xbrlkit on your own machine, as an MCP server, from the command line and as a library

## Quick Start

Needs Node.js 26. No API and no keys.

```bash
npm install
npm run dev              # http://localhost:5173
```

The dev server opens on the SEC lane; `/file` takes the bundled sample report or your own file. To try a `?url=` link, use `npm run preview`: the dev server cannot serve one, because Vite reserves that query.

No setting is required. To change one, copy `.env.example` to `.env`:

| Variable                                              | Purpose                                                                             |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `VITE_FILINGS_CDN_URL`                                | The CDN the SEC lane reads; defaults to `https://public.robosystems.ai`             |
| `VITE_LOCAL_REPORT_COMPONENTS`                        | `true` renders with a sibling `robosystems-report-components` checkout's build      |
| `VITE_RESEARCH_CATALOG_URL`, `VITE_RESEARCH_BASE_URL` | The research portal a filing's page links to                                        |
| `VITE_CF_ANALYTICS_TOKEN`                             | Adds the Cloudflare Web Analytics beacon to the build; unset, the site carries none |

### Deploying your own

1. Fork this repository.
2. Set the repo variables `AWS_ROLE_ARN`, `AWS_ACCOUNT_ID` and `AWS_REGION`, for an IAM role that trusts the repository through GitHub OIDC and may run CloudFormation, S3 and CloudFront.
3. Create a `production` GitHub environment with a required reviewer; every deploy waits there for approval.
4. Run the `deploy.yml` workflow. It builds the site and deploys the stack in [`cloudformation/`](cloudformation/).

Optional repo variables: `VIEWER_DOMAIN` gives the site a custom domain in a Route53 hosted zone (an apex domain also gets `www.`, redirected to it), `VIEWER_LEGACY_DOMAIN` serves an earlier name as an alias, and `CF_ANALYTICS_TOKEN` turns on the analytics beacon. An `ACTIONS_TOKEN` secret that can push to `main` and `release/*` lets the release workflow push its version bump.

## Development

```bash
npm run dev              # development server on port 5173
npm run build            # production build to dist/ (npm run preview to serve it)
npm run test             # Vitest suite
npm run test:watch       # Vitest in watch mode
npm run test:all         # format check, lint, typecheck, tests and build (the CI gate)
npm run lint             # ESLint (lint:fix to fix)
npm run format:check     # Prettier (format to write)
npm run typecheck        # TypeScript
```

The rendering comes from [`@robosystems/report-components`](https://www.npmjs.com/package/@robosystems/report-components) ([robosystems-report-components](https://github.com/RoboFinSystems/robosystems-report-components)), shared with the RoboLedger app. Changes are made there and reach the viewer through a version bump: `npm install @robosystems/report-components@latest`.

The `/mcp`, `/cli` and `/python` pages mirror the commands in the [xbrlkit README](https://github.com/RoboFinSystems/xbrlkit#readme); a change there is a change here.

## Architecture

- **Vite, React 19 and TypeScript**: a single-page app that builds to static files, with no backend at runtime
- **[`@robosystems/report-components`](https://www.npmjs.com/package/@robosystems/report-components)**: the `holon.jsonld` and `tavi.json` parsers and the statement rendering. This repository is the shell around it: search, file drop, fact inspection, chat, voice
- **In-browser query**: N3.js and Comunica run SPARQL over a holon; jq compiled to WebAssembly runs over a Tavi model, in a Web Worker with a time limit
- **AI and voice**: the Anthropic SDK and ElevenLabs, called from the browser with the reader's own keys
- **Five lanes, no router**: the lane comes from the address (`src/pages/route.ts`) and each lane's title and share text from one table (`src/pages/routeMeta.ts`). The build writes an `index.html` per lane, so crawlers and link previews read each lane's own meta

**On AWS:** S3 behind CloudFront, deployed from the CloudFormation template in [`cloudformation/`](cloudformation/) by GitHub Actions. A CloudFront Function maps each lane's path to its page and `/view` to the apex page. `create-release.yml` bumps the version, tags `v<version>` and dispatches `deploy.yml` at the tag; `test.yml` runs on pull requests.

## Documentation

- **Using xbrlkit**: [MCP](https://xbrlkit.com/mcp) · [CLI](https://xbrlkit.com/cli) · [Python](https://xbrlkit.com/python)
- **Technical docs**: [robosystems.ai/docs/technical](https://robosystems.ai/docs/technical)
- **Related**: [xbrlkit](https://github.com/RoboFinSystems/xbrlkit) · [report-components](https://github.com/RoboFinSystems/robosystems-report-components) · [RoboSystems](https://github.com/RoboFinSystems/robosystems)

## Support

- [Issues](https://github.com/RoboFinSystems/xbrlkit-viewer/issues) · [Discussions](https://github.com/orgs/RoboFinSystems/discussions) · [Projects](https://github.com/orgs/RoboFinSystems/projects)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

MIT © 2026 RFS LLC
