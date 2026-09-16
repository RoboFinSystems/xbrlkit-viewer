---
description: Review the staged diff against this viewer's bring-your-own-keys model and rendering rules.
---

Review all staged changes (`git diff --cached`) with focus on the contexts below. Read the diff first — if nothing is staged, say so rather than reviewing the working tree.

This is the **xbrlkit viewer**: a static, client-side React/Vite renderer for `holon.jsonld` and `tavi.json` financial reports. **There is no backend.** SPARQL runs in the browser (Comunica), the AI agent calls Anthropic directly from the browser, and the user's API keys live only in their browser. It is a **public repository**.

## Bring-your-own-keys — the highest-stakes property in this repo

Users enter **their own** Anthropic and ElevenLabs API keys into a keys drawer, on the explicit promise that those keys are persisted only in their browser and never sent to an app backend (there isn't one). Any staged change touching key handling deserves the closest possible reading:

- Does a key reach **anywhere other than the intended provider**? A new analytics call, error reporter, log line, or telemetry hook that includes request state can exfiltrate a user's key. This is the single worst bug this app could ship.
- Is a key written anywhere more durable or more shared than intended (cookies, URL parameters, `postMessage`, a service worker cache)?
- Do error paths stringify a request object that carries an `Authorization` header? A key in a console error is a key in a screenshot.
- Does a new third-party script or dependency get access to page state? On a keys-in-browser app, a supply-chain addition is a credential risk, not just a bundle-size one.

If the diff adds any outbound call, name every destination and confirm it's a provider the user knowingly supplied a key for.

## Rendering correctness

- Statement reconstruction comes from `@robosystems/report-components` over the holon's named graphs. A rendering fix that belongs upstream in that package will be overwritten by the next version bump — flag it and point there.
- Does the change alter a **displayed number**, a subtotal, or a dimensional breakdown? Users read these as financial statements; a silent numeric change is the worst rendering outcome.
- Does it hold for holons produced by `xbrlkit` generally, or only the file in front of you?

## Modes

- **File mode must stay offline.** Opening a local `holon.jsonld` should make no network call at all. A change that introduces a fetch on that path breaks a stated guarantee.
- **SEC mode** uses the user's RoboSystems key client-side. Check scope and error handling — a failed authenticated call should not leak the key into the message.

## Client-side SPARQL and AI

- Comunica queries run over the loaded RDF in the browser. Is a new query bounded, or can a large report hang the tab?
- The AI agent answers by running SPARQL — are its tool results actually grounded in the report, or can it answer from the prompt? An answer that looks grounded and isn't is worse than a refusal.

## Build and quality

- `npm run test:all` is `format:check` → `lint` → `typecheck` → `test` → `build` — **check-only**, so it fails rather than reformatting. Fix and re-stage.
- The build is Vite; the output is a static bundle deployed to CloudFront/S3 (`XbrlkitViewer`). There is no server to fix a mistake at runtime.

## Public-repo hygiene

- No API keys of any kind — including test keys, which get used.
- SEC filing content is public data, so fixtures from real filings are fine.
- No internal infrastructure detail beyond what the deploy workflow already exposes.

## Output

1. **Issues**: Problems that should be fixed before commit
2. **Suggestions**: Improvements that aren't blocking
3. **Questions**: Anything unclear

Anchor findings to `file:line`. If the diff touches key handling or adds an outbound call, say so first and explicitly, even if everything else is clean.
