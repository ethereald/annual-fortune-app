# Handoff: Phase 4 (after Phase 3 運程 interpretation)

Read first: `handoff-phase-3.md` (background, dataset rules), `packages/core/data/authoring/README.md` (snippet pipeline).

## Done in Phase 3 follow-up
- **Traditional Chinese only.** The engine stays Simplified internally. The web app converts at display time with `opencc-js` (added to `apps/web`), through `apps/web/src/zh.ts` (`toTW`, `proseToTW`, `normalizePalaceName`, which maps 僕役 to 交友).
- **運程 reading** is generated locally by `apps/web/src/yearly-fortune.ts` (`buildYearlyFortune`, `fortuneToMarkdown`). It uses the 流年命宮 position, where each 流年四化 lands, and star-trait templates (`STAR_TRAITS`, `TRANS_AREA`) written by me. The tone tag (機會較多 / 平穩 / 宜謹慎) is a simple score from the 四化 that land in each area.
- **Detail levels:** 精簡 shows the overview and 四化 notes. 標準 adds the per-area notes. 深入 adds 逐月運程.
- **Monthly data:** `computeYear` in `packages/core/src/engine.ts` now returns `months` (`MonthlyCalculation`). It includes leap months, as a negative `lunarMonth`, and the 西曆 range (`solarStart`, `solarEnd`). The 12 existing tests pass.
- **Export:** "匯出完整報告" writes Markdown for the whole year range at the chosen depth, and "列印／存成 PDF" calls `window.print()` with print CSS in `styles.css`.
- **Old interpretation data:** the natal 宮位星曜解讀 is now a collapsed `<details>` section with attribution, because it was too technical.
- **PWA:** `vite.config.ts` precache limit raised to 4 MiB. The single-file build is about 3.07 MB.
- **Checked:** `npm test`, `npm run build` and `npm run build:single` pass, and the UI and export were tested in a browser.

## Open items
1. **No tests** for `yearly-fortune.ts`, the monthly engine data or the export. Add unit tests, for example the leap-month 2025 ranges and the 精簡 / 標準 / 深入 differences.
2. **README** still describes the old detail levels. A short Phase 3 note was added, but it does not mention 逐月 or the two export buttons.
3. **Template wording needs human review** by someone who knows 紫微斗數. Monthly text reuses the yearly area text with 今年 swapped for 本月. Leap-month 四化 are not checked against a reference. The monthly "本月重心" uses `monthly.index` mapped to natal palaces, which is also unchecked.
4. The PDF/print layout was never opened in a browser.
5. `rightsConfirmed: true` in `sources.json` still needs human confirmation of the dataset license.
6. The bundle grew by about 1 MB because of `opencc-js`. Consider a smaller converter, or importing only the `cn2t` data.
7. Ideas not started: 大限 (decade) reading, a year-by-year summary table across the range, more mined dataset coverage (see `handoff-phase-2.md`), and true-solar-time or city lookup.

## Gotchas
- Source files use CRLF in places, so multi-line string replaces from PowerShell may not match. Use the `edit` tool instead.
- Write files from Node or the edit tools, not PowerShell `>`, which writes UTF-16.
- `npm run dev` needs `packages/core` built first, because it imports `dist`. Run `npm run build` after changing core.
- Stop any dev server you start (I used port 5199).

## Suggested skills
- `implementing-code` for the implementation workflow.
- `typescript-runtime-validation` to validate the web app end to end.
