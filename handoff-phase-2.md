# Phase 2 Handoff: Snippet Pipeline

## Next-session focus

Implement Phase 2 from [`implementation_plan.md`](./implementation_plan.md): build the licensed interpretation-snippet extraction/authoring pipeline and its coverage/size gates. Phase 1 is complete; its current state and constraints are summarized in [`handoff-phase-1.md`](./handoff-phase-1.md). Use those documents rather than redoing the engine and UI implementation.

## Current verified state

- Natal and annual chart structure are calculated locally through the Web Worker; the app renders results and exports Markdown.
- Third-party MIT notices are displayed in the app and included in the single-file HTML.
- The standalone build embeds its worker and emits no separate worker asset.
- Latest validation passed: `npm test` (17 tests), `npm run build`, `npm run build:single`, moderate-level npm audit (0 vulnerabilities), and all four assertions in `.tsupgrader/runtime-validation/eval-plan.json`.
- The production build reports an oversized JavaScript-chunk warning; builds still pass.

## Phase 2 guardrails

- Follow the source, licensing, provenance, and size gates in [`implementation_plan.md`](./implementation_plan.md). Verify permission and attribution before using any snippet source.
- Keep extraction/authoring tools build-time-only. Do not ship source datasets or bundle the 56 GB dataset described by the plans.
- Produce small, deduplicated, properly attributed dimension shards. Include summary/standard/deep tier metadata and a versioned manifest tied to the pinned school setting.
- Add coverage checks using representative charts; surface missing lookups rather than inventing interpretations.
- Measure shard and compressed output sizes before deciding whether the data approach passes its gate. Do not begin report prose or interpretation behavior until licensing, coverage, and size are demonstrated.

## Relevant references

- [`implementation_plan.md`](./implementation_plan.md): phase requirements, source options, architecture, and constraints.
- [`README.md`](./README.md): engine provenance, calculation boundaries, and current limitations.
- [`packages/core/src/engine.ts`](./packages/core/src/engine.ts): chart calculation API for coverage fixtures.
- [`packages/core/src/engine.test.ts`](./packages/core/src/engine.test.ts): existing deterministic chart expectations.
- [`apps/web/src/third-party-licenses.txt`](./apps/web/src/third-party-licenses.txt): notices currently bundled and shown in the app.
- [`.tsupgrader/runtime-validation/eval-plan.json`](./.tsupgrader/runtime-validation/eval-plan.json): repeatable baseline checks for build, standalone build, tests, and dev-server response.

## Suggested skills

- `implementing-code` — use for a bounded implementation batch with tests and traceability.
- `typescript-runtime-validation` — use after pipeline changes to validate TypeScript builds, tests, and runtime behavior.
- `assessment-report-converter` — only if an existing third-party tabular report needs to be interpreted and converted into structured assessment data; it is not a substitute for authoring or licensing app interpretation text.

## Useful commands

From the project root:

```sh
npm test
npm run build
npm run build:single
npm audit --audit-level=moderate
```
