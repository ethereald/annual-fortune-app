# Annual Fortune

An offline-first workspace for calculating Zi Wei Dou Shu chart structure and preparing annual report requests. The web app stores saved profiles in browser storage and includes a PWA build and a single-file HTML build.

## Development

```sh
npm install
npm run dev
```

## Checks and builds

```sh
npm test
npm run build
npm run build:single
```

The normal build writes the installable web app to `apps/web/dist`. The single-file build writes a self-contained `apps/web/dist/index.html`.

## Calculation boundary

The app calculates the natal chart and yearly palace, transformations, and annual stars locally in a Web Worker. Late Zi births (23:00–23:59) use the following calendar day. Birth-time input is used as entered: city coordinates, historical daylight-saving adjustments, and true-solar-time correction are not yet available. A male or female selection is required because the engine uses it to determine decade-cycle direction.

The UI is Traditional Chinese only (engine output is converted from Simplified with `opencc-js` at display time). Each year shows a plain-language 運程 reading built locally in `apps/web/src/yearly-fortune.ts`: the 流年命宮 position, where each 流年四化 lands among the 12 palaces, and per-area (事業, 財運, 感情, 健康 …) notes derived from natal star traits. The text is authored templates, not licensed data, and is for cultural reference. The "精簡" detail level shows the overview only. A collapsed section lists the natal palace/star interpretations mined from the CC BY 4.0 dataset (partial coverage). City lookup, true-solar-time correction and PDF export are not included. The app does not send birth information to a server.

## Snippet authoring pipeline

The build-time-only authoring pipeline is in `packages/core/tools` and reads its source registry and authored entries from `packages/core/data/authoring`; the input schema and review requirements are documented in [`packages/core/data/authoring/README.md`](./packages/core/data/authoring/README.md). It validates rights evidence and attribution, deduplicates entries into dimension shards and `classics.json`, pins the `quanshu` school setting, and measures the compressed payload against the 15 MiB gate. Generated files stay under the ignored core `dist` directory and are not included in either web build.

Run `npm run snippets:build` to validate and build the shards, and `npm run snippets:coverage` to check lookups against the star matrix and representative charts. Interpretation snippets are mined at build time from the CC BY 4.0 [Ziwei Doushu interpretation dataset v4.0](https://github.com/Renhuai123/ziwei-doushu/releases/tag/v4.0-13d) (see the authoring README for the rules); quoted 倪海厦《天纪》 text is excluded. Rights and size gates pass, coverage is partial, and missing lookups are reported, never filled with generated interpretations.

## Engine provenance

The chart algorithm and school tables in `packages/core/src/ziwei` are adapted from [Renhuai123/ziwei-doushu](https://github.com/Renhuai123/ziwei-doushu), pinned to commit `1059c347231c636bd86ddb78fd8ed430d5de8d2a` and distributed under the MIT License. The upstream license is included at `packages/core/src/ziwei/LICENSE`. The engine uses the MIT-licensed `iztro` and `lunar-javascript` packages. Their notices are displayed in the app and embedded in both the PWA shell and single-file HTML. No dataset or interpretation corpus is bundled.
