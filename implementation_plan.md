# Offline Annual Fortune App: Implementation Plan (PWA + PC)

Based on `offline_annual_fortune_plan.md` and the reference repo https://github.com/Renhuai123/ziwei-doushu.
Targets: installable offline PWA (phone), PC desktop app (Tauri) and single-file offline HTML. Free static hosting (Cloudflare Pages primary, Vercel backup). Features: fortune year range, detail level, export to .md / PDF.

## 1. Constraints from the reference repo

| Finding | Effect |
|---|---|
| Engine is TypeScript (`algorithm.ts`, `yunxian-context.ts`, `true-solar-time.ts`, `lunar-solar.ts`, `dst-cn.ts`, `cities.ts`), MIT | Runs in the browser, no backend |
| v4.0 dataset: 8.77M segments, 56.6 GB unpacked (161 MB zipped) | Never shipped. Only used at build time, or not at all |
| 断语库 (site interpretation rules) is not open source | Text must come from dataset mining or from the public-domain 全书 |
| Dataset CC BY 4.0; 倪师 quotes CC BY-NC-SA | Attribution screen; keep quotes out of the bundle or label non-commercial |
| Dataset was generated with old brightness default (现代修正 v2); engine now defaults to 《斗数全书》 | Pin one school setting, regenerate/validate data against it |
| `hour` is a branch index 0-11, not a clock hour | Clock-to-branch converter with tests |

## 2. Architecture (changes from original doc)

- **Frontend:** Vite + React + TS + Tailwind + shadcn/ui (static SPA, no SSR).
- **Offline (phone):** PWA with service worker (`vite-plugin-pwa`), precached shell, data shards and CJK font.
- **Offline (PC):** Tauri v2 installer (`.exe`/`.msi`/`.dmg`/`.AppImage`) and a single-file HTML build (`vite-plugin-singlefile`).
- **Data:** sharded static JSON (switch to sql.js only if joins are needed), not SQLite bindings.
- **Engine:** runs in a Web Worker.
- **Monorepo:** `packages/core` (engine, data, report builder, MD/PDF generators, no DOM/Tauri deps), `apps/web` (PWA), `apps/desktop` (Tauri shell loading the web build).
- **Platform interface:** file save, share and storage, with one implementation per target (web, Tauri, single-file).
- **Privacy:** birth data stays local. Tauri CSP is strict with no network allowlist.

### Snippet source (no 56 GB)

- **Option A:** mine one year's dataset file at build time, dedupe into unique snippets keyed by star + palace + brightness + 四化 + dimension.
- **Option B:** write snippets from the public-domain 《紫微斗数全书》 and repo data (`quanshu.ts`, patterns, sihua).
- Try A in Phase 0. If the unique count is small, keep A, otherwise use B.

## 3. Phases

### Phase 0: Feasibility spike (2-3 days, gate)
1. Run the engine in a bare Vite page (natal + flowing-year chart for 2027).
2. Inspect one v4.0 year file: unique segments per dimension; decide shard design and bundle size.
3. Confirm `yunxian-context.ts` returns flowing palace, flowing 四化 and 神煞.
4. Settle license plan and draft the attribution page.

Exit: distilled data about 15 MB gzipped or less, engine works in a browser, licenses settled. Otherwise fall back to Option B.

### Phase 1: Scaffold and engine port (3-4 days)
- Monorepo, engine copied to `packages/core` with MIT notice, Web Worker API (`computeNatal`, `computeYear`).
- Tests against golden charts (`famous.ts`), hour-index conversion, leap month, 晚子时, true solar time.
- CI: test and build.

### Phase 2: Snippet extraction / authoring pipeline (4-6 days)
- Build-time Node script (not shipped) that dedupes or writes snippets into shards (`data/{dimension}.json`, `classics.json`).
- Each entry tagged with a `detail` tier: summary / standard / deep.
- Coverage check: run the engine over sample charts and flag lookups with no text.
- Manifest records dataset version and school setting.

### Phase 3: Interpretation and report engine (4-5 days)
- Lookups: planetary matrix, flowing 四化, classics.
- Report model sections: overview, 12 palaces, 13 dimensions, flowing 四化 and 神煞, classical references.
- Input: `{ yearFrom, yearTo, detailLevel, dimensions[] }`. Output: Markdown. Snapshot tests.

### Phase 4: UI (5-6 days)
- Half-day wireframe pass first.
- Input form: date, time, gender, city (searchable), school setting.
- Range selector (single year, 5, 10, custom). Detail selector (Brief / Standard / Full), optional dimension checkboxes.
- Results: mobile-friendly 12-palace grid, per-year tabs/accordion, Markdown preview.
- Local saved profiles, delete-all button. Traditional default, optional Simplified toggle.
- Layout: PC sidebar (Profiles, New Report, Settings) plus content; phone bottom tab bar. Report screen: year tabs and outline on the left, text in the middle, sticky bar with range, detail and Export. Light/dark theme, keyboard shortcuts, bundled CJK font.

### Phase 5: Export (3-4 days)
- Markdown: Blob download (filename includes range and detail); Web Share where available; Tauri native Save As via dialog/fs plugins.
- PDF: client-side in a worker, embedded subset Noto CJK font, pagination, palace grid as vector table, page-streamed for large reports.
- Test on real iOS Safari and Android Chrome.

### Phase 6: PWA and offline (2-3 days)
- Manifest, icons, precache of shell, data and font; versioned "update available" prompt.
- Offline-ready indicator, install prompt, iOS manual instructions, `navigator.storage.persist()`.
- Lighthouse audit in airplane mode.

### Phase 7: Web deploy and release (1-2 days)
- Cloudflare Pages from GitHub: immutable caching for hashed assets, `no-cache` for `sw.js` and `index.html`. Vercel config as backup.
- Disclaimer (entertainment, 六亲 caveat) and attribution/license screen.
- Real-device test: install, airplane mode, generate, export both formats.

### Phase 8: Desktop packaging (3-4 days)
1. `src-tauri/` with web build as `frontendDist`, strict CSP, no remote URLs.
2. Engine stays in the WebView worker (same as PWA); no Rust/SQLite bindings.
3. Icons, window title, remembered window size.
4. GitHub Actions matrix (Windows/macOS/Linux) builds installers and attaches them to a Release.
5. `build:single` produces the single-file offline HTML.
6. Test on a clean Windows VM; bundle the WebView2 offline installer for Windows 10.
7. Unsigned builds trigger SmartScreen: document "More info, Run anyway". Code signing later.

## 4. Risks

| Risk | Mitigation |
|---|---|
| Distilled data too large | Phase 0 gate; tiered lazy shards, fetch "Full" tier on request |
| iOS Safari evicts cached data | Persist storage, "Download data pack again" option, small shell |
| CJK PDF heavy/slow | Subset font, paginate, worker |
| School setting mismatch | Pin one setting, regenerate data |
| 倪师 quote licensing | Exclude by default or label non-commercial |
| SmartScreen warnings on PC | Documented workaround; single-file HTML fallback |

## 5. Timeline

About 5-6 weeks for one developer (PC version adds about one week). Phase 0 decides whether the data approach holds, so do it first.
