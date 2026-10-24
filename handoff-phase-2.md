# Handoff: Phase 2 complete (partial coverage) → Phase 3

## State

Phase 2 build-time pipeline is done and populated from real, redistributable content. The app UI still shows only the 命盤; nothing consumes the snippets until Phase 3.

| Gate | Result |
|---|---|
| Rights | pass (CC BY 4.0 dataset + public-domain 《紫微斗数全书》; attribution in `apps/web/src/third-party-licenses.txt`) |
| Size | pass (about 36 KB compressed of 15 MiB) |
| Coverage | **partial**: major-star matrix 84/182 (46.2%) |
| Content readiness | **partial** |

Content: 84 interpretation keys (summary/standard/deep where available) and 222 classical references. Quoted 倪海厦《天纪》 text is excluded (outside the license grant).

## Gaps
- `overview` 0/14 (leads entangled with 倪师 quotes), `career` 3/14, `family` 2/14, `children` 5/14, `personality` 3/14.
- Sample-chart coverage per dimension varies (for example career 0/5, family 0/9).
- Only the 1990 year file was mined; other years are likely to repeat but this is unverified.
- Minor, lucky and sha stars, brightness and 四化 variants have no lookups (resolved to the star and palace base key).

## Needs a human
- `rightsConfirmed: true` in `sources.json` is my reading of the dataset's `DATASET-LICENSE`. Verify before release.
- The dataset's engine commit (`c25dd495`) differs from this app's pin (`1059c347`). Lookups are by star and palace only, so charts are unaffected; recheck if the pin changes.

## Phase 3 rules
- Consume only content with `contentReady` of `partial` or `pass`.
- When a lookup is missing, omit that section or state it is unavailable. Never generate filler interpretation.
- To widen coverage: mine more year files, or author original text with a reviewed source record.

## Commands
- `npm run snippets:mine --workspace @annual-fortune/core -- <year.jsonl.zst> <SHA256SUMS.txt>`
- `npm run snippets:build`, `npm run snippets:coverage`
- `npm test`, `npm run build`, `npm run build:single`

Details: `packages/core/data/authoring/README.md`.
