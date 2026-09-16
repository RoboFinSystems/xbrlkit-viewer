---
description: Start the viewer's dev server and verify it renders.
---

Start the Vite dev server for the xbrlkit viewer.

## Prerequisites

- **Node 24+** and dependencies installed — `test -d node_modules || npm install`.
- **No backend, and no `.env` needed to start.** This is a static client-side app; API keys are entered at runtime in the keys drawer, not through the environment.

## Start

```bash
npm run dev
```

Vite serves on **http://localhost:5173** by default. Run it as a **background** command rather than appending `&` — a foreground dev server blocks until killed.

```bash
npm run preview     # serve the production build instead, after `npm run build`
```

Use `preview` when you're debugging something that only reproduces in the built bundle — this app ships as a static bundle with no server, so build-only differences are real.

## Verifying a change

There's no health endpoint to curl; the app either renders a report or it doesn't. So:

1. **File mode** — open a local `holon.jsonld`. This path must work **fully offline**: no API key, no network call. If you're changing anything near loading or rendering, test with the network throttled to offline and confirm it still renders.
2. **SEC mode** — needs no key: it reads the filer catalog and each filing's `tavi.json` / `holon.jsonld` from the public data CDN (`VITE_FILINGS_CDN_URL`, production by default) straight from the browser. Search a ticker, open a filing, confirm it renders and the chat answers over it.
3. **AI / voice** — need Anthropic and ElevenLabs keys respectively, entered the same way. These spend real money per call; don't loop them while debugging.

Sample holons come from `xbrlkit` (`xbrlkit build …`) — generate one rather than hunting for a fixture if you need a specific filing shape.

## When it doesn't come up

- **Blank page, no error** → check the browser console; a client-side render failure won't show in the terminal.
- **A report renders wrong rather than not at all** → decide whether it's the holon or the viewer. Open the same file in a JSON viewer and check the underlying facts before debugging rendering; if the holon is wrong, the fix belongs in `xbrlkit`.
- **Statement layout looks wrong** → that's likely `@robosystems/report-components`, not this repo. Fixing it here gets overwritten on the next version bump.
- **Keys "disappear"** → they persist only in the browser by design; a different browser, profile, or a cleared site data wipes them. That's the intended model, not a bug.
