## Summary

<!-- What this PR does and why. Ground it in the actual change, not the diff mechanics. -->

## Changes

<!-- Grouped by area: report rendering, modes (file/SEC), keys drawer, AI + SPARQL, voice, shell.

     Note statement rendering largely lives in @robosystems/report-components and conversion in
     xbrlkit — a local patch over either is overwritten or masks the real bug. -->

-

## Key Handling

<!-- Required judgment. Users enter their OWN Anthropic, ElevenLabs, and RoboSystems keys on the
     promise that they stay in the browser and reach no app backend — there isn't one.

     "No change" if this diff touches no key storage, transport, or outbound request. Otherwise
     name EVERY destination the change can send data to, and confirm each is a provider the user
     knowingly supplied a key for. A new dependency with access to page state counts.

     Also say whether file mode's offline guarantee still holds: opening a local holon must make
     no network call at all. -->

No change

## Testing

<!-- Run `npm run test:all` (format:check -> lint -> typecheck -> test -> build) before opening.
     It is CHECK-ONLY, so fix and re-stage rather than expecting it to rewrite for you.

     Unit tests do not cover rendering, the keys drawer, in-browser SPARQL, or the AI agent — say
     whether you actually LOADED A REPORT, and in which mode. "Not run" is a valid answer. -->

## Certification

<!-- See .github/CONTRIBUTING.md, "Licensing and Certification". Asserts provenance, not a transfer of rights. -->

- [ ] I have the right to submit this work under the MIT license, and do so. Where any part of it is owned by my employer, I have their permission.
