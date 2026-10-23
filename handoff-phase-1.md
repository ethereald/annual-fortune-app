# Phase 1 Handoff: Annual Fortune App

## Purpose for the next session

Continue Phase 1 of the implementation plan: establish the core calculation layer and connect it to the existing offline-first UI. The current workspace is an early scaffold, not yet a Zi Wei Dou Shu chart calculator.

## Current workspace state

- The project was initially empty apart from its plans. It now has an npm workspace with `packages/core` and `apps/web`.
- The current web app supports a Traditional Chinese report-request form, year presets, saved local profiles, theme switching, offline status, and Markdown export of the request settings.
- The core package defines request/profile types, validates dates/times/year ranges, and maps clock times to the 12 earthly-branch hour indices.
- PWA and single-file HTML build configurations are in place.
- Birth data is stored in browser `localStorage`; there is no backend.
- The calculation engine, city coordinates, and licensed interpretation text have not been added. The UI deliberately does not present fabricated fortune results.
- Tauri packaging and PDF export are not implemented.

## References

- Follow scope, architecture, constraints, and phase gates in [`implementation_plan.md`](./implementation_plan.md).
- Use [`offline_annual_fortune_plan.md`](./offline_annual_fortune_plan.md) as supplementary architecture background, noting that the implementation plan supersedes its SQLite direction with sharded static data and a browser worker.
- Current project usage notes are in [`README.md`](./README.md).
- Main surfaces: [`apps/web/src/App.tsx`](./apps/web/src/App.tsx), [`apps/web/src/styles.css`](./apps/web/src/styles.css), and [`packages/core/src/index.ts`](./packages/core/src/index.ts).

## Verification already completed

- `npm test`: 12 core tests passed.
- `npm run build`: TypeScript and production PWA build passed.
- `npm run build:single`: generated a self-contained HTML file successfully.
- `npm audit --audit-level=moderate`: 0 vulnerabilities after upgrading Vitest to 5.0.5.
- Production preview smoke check returned HTTP 200 for the app page, PWA manifest, and service worker.
- Browser visual automation was attempted but could not launch because the Playwright browser executable is absent. Do not treat this as an app defect.

## Useful commands

From the project root:

```sh
npm install
npm run dev
npm test
npm run build
npm run build:single
```

Open `http://localhost:5173` after starting the dev server.

## Suggested next steps

1. Inspect the engine source and license before porting. The plans identify the upstream reference repository and relevant engine modules, but those source files are not present in this workspace.
2. Implement the minimal engine port and Web Worker API (`computeNatal`, `computeYear`) with explicit provenance/licensing and deterministic tests. Keep birth data local.
3. Add golden-chart/hour-index and relevant calendar/time-correction tests when the source engine and fixtures are available.
4. Wire actual chart results into the UI only after engine outputs are verified; keep unsupported interpretations clearly marked.
5. Re-run tests, both builds, and dependency audit. Browser testing may require installing the local Playwright browser separately if visual interaction checks are needed.

Do not try to acquire or bundle the 56 GB dataset described in the plans. Respect their snippet-source and licensing constraints.

## Suggested skills

- `implementing-code` — for executing a bounded implementation batch with tests and requirement tracing.
- `typescript-runtime-validation` — for validating the TypeScript app build and runtime behavior.
- `building-java-knowledge-graph` is not relevant; this is a TypeScript project. Use `cve-remediation` only if dependency vulnerabilities are found.
