# Phase 1 Handoff: Chart Engine Integrated

## Purpose for the next session

Phase 1 is implemented. Continue with Phase 2 from [`implementation_plan.md`](./implementation_plan.md): design and build the licensed snippet extraction/authoring pipeline. Do not start report interpretation or bundle the large dataset before its size, licensing, and coverage gates are satisfied.

## Current workspace state

- The npm workspace contains `packages/core` and `apps/web`.
- The core package calculates natal chart structure and annual flow locally using a Web Worker. It exposes `computeNatal` and `computeYear`.
- The web app renders the 12 palaces, annual palace, four transformations, annual stars/deities, supports year navigation, and exports the structural result as Markdown.
- The PWA build uses a separate worker asset. `npm run build:single` embeds its worker and third-party license notices in the standalone HTML.
- Saved birth profiles remain in browser `localStorage`; birth data is not sent to a server.
- Engine source and dependency MIT notices are available in the app's open-source notices disclosure. Engine provenance is documented in [`README.md`](./README.md).
- The app reports clock-time-only calculations: city coordinates, historical daylight-saving adjustments, and true-solar-time correction are unavailable. Late Zi births advance the charting date. Gender selection is required for decade-cycle direction.
- Interpretation text/report prose, city lookup, PDF export, and Tauri packaging are not implemented. The detail selector does not change structural calculations.

## Engine and tests

- The algorithm and school tables are adapted from `Renhuai123/ziwei-doushu`, pinned to commit `1059c347231c636bd86ddb78fd8ed430d5de8d2a`.
- Engine dependencies are MIT-licensed `iztro` and `lunar-javascript`.
- Regression tests pin natal and annual outputs and cover late Zi behavior, gender requirements, and invalid years.

## Verification

- `npm test`: 17 tests passed.
- `npm run build`: production PWA build passed; the engine worker is emitted separately.
- `npm run build:single`: passed; generated only `index.html`, with worker code and license notices embedded.
- `npm audit --audit-level=moderate`: 0 vulnerabilities.
- `.tsupgrader/runtime-validation/eval-plan.json` defines repeatable checks for both builds, tests, and a development-server HTTP probe. Re-run the plan after future changes.
- Browser visual automation previously could not launch because the Playwright browser executable was unavailable; this was an environment limitation, not an app failure.

## Phase 2 guardrails and suggested steps

1. Inspect the implementation plan and verify the licensing/source provenance of any snippet source before extraction or authoring.
2. Keep any extraction tooling build-time-only; ship only deduplicated, attributed, appropriately licensed snippets in small dimension shards.
3. Add summary/standard/deep tier metadata, a versioned manifest with the pinned school setting, and coverage checks against sample charts.
4. Measure shard and compressed bundle sizes before deciding whether the data approach passes its gate. Do not acquire or bundle the 56 GB dataset described in the plans.
5. Keep interpretation claims separate from verified chart structure; do not invent text for missing coverage.

## Useful commands

From the project root:

```sh
npm install
npm run dev
npm test
npm run build
npm run build:single
npm audit --audit-level=moderate
```
