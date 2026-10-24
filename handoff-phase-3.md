# Handoff: Phase 3 (interpretation view), in progress

Read first: `handoff-phase-2.md` (gates, gaps, rules), `implementation_plan.md` (Phase 3 definition), `packages/core/data/authoring/README.md` (pipeline).

## Where things stand
- Phase 2 is done: rights pass, size pass, coverage **partial** (84/182 major-star matrix, 46.2%). `npm test`, `npm run build`, `npm run build:single` and `npm audit` passed. After the last coverage-check fix I re-ran only tests and coverage.
- Coverage-check bug fixed in `packages/core/tools/snippets.mjs`: sample charts now match palaces without the 宫 suffix, and an empty 四化 counts as null.
- The dataset attribution was appended to `apps/web/src/third-party-licenses.txt`.
- The user asked "still only has 命盤 but no interpretation?". Phase 3 work has started to answer that, and the UI does not use the data yet.

## Phase 3 work started
- DONE: `App.tsx` now imports `interpretations.json` and renders a 宮位星曜解讀 section (standard tier, summary fallback, "暫無可用解讀" when missing, attribution). Styles added; build, build:single and tests pass. Single-file build is about 1.96 MB.
- Remaining: browser visual check, a UI test, README note, mining more years.
- New `packages/core/tools/export-web-interpretations.mjs` with script `npm run snippets:export-web --workspace @annual-fortune/core`. It writes `apps/web/src/interpretations.json` (about 69 KB) in the shape `{ attribution: string[], palaces: { [palaceWithout宫]: { [star]: [{ dimension, summary?, standard?, deep? }] } } }`. It includes only base keys (brightness and 四化 null). It does not include the classics.
- The export has been run once (84 palace/star entries). `apps/web/tsconfig.json` already has `resolveJsonModule`.

## Next steps
1. In `apps/web/src/App.tsx`, import `./interpretations.json` and add an interpretation section to the result card (around the `palace-grid`, line ~640). Natal palace names come without the 宫 suffix (for example "官禄"). For each palace, look up each major star (`star.type === "major"`) in `palaces[palace.name][star.name]` and show the `standard` tier, with `summary` as a fallback.
2. Missing lookups: show nothing or an explicit "此宮位暫無解讀" note. Never generate filler text. Overview (命宫) has 0 coverage, so say so honestly.
3. Show the dataset attribution next to the interpretation section. It is also in the licenses panel.
4. Add a status or disclosure line saying coverage is partial. Update the intro text that currently says "不是運勢解讀".
5. Add a UI-level test if feasible, and a check that the exported JSON matches the authoring data.
6. Update `README.md` and this handoff, and decide whether to mine more year files to raise coverage. See the commands in `handoff-phase-2.md`.
7. Verify with `npm test`, `npm run build`, `npm run build:single` and `npm audit --audit-level=moderate`. Check the single-file size (it was about 1.9 MB before this change). Use the browser tools to check the UI.

## Open issues
- `rightsConfirmed: true` in `sources.json` is my reading of the dataset license. A human must confirm it.
- Dataset engine commit `c25dd495` differs from this app's pin `1059c347`. The impact is low, because lookups are by star and palace.
- The PowerShell `>` redirection writes UTF-16, so write files from Node. The `create` tool cannot overwrite existing files, so use `edit` for those.

## Suggested skills
- `implementing-code` for the implementation workflow.
- `typescript-runtime-validation` to validate the web app end to end.
