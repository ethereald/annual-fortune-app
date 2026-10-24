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

This phase produces chart structure only. Licensed interpretation text, report prose, city lookup, and PDF export are not included; the detail selector does not change the calculation output yet. The app does not send birth information to a server.

## Engine provenance

The chart algorithm and school tables in `packages/core/src/ziwei` are adapted from [Renhuai123/ziwei-doushu](https://github.com/Renhuai123/ziwei-doushu), pinned to commit `1059c347231c636bd86ddb78fd8ed430d5de8d2a` and distributed under the MIT License. The upstream license is included at `packages/core/src/ziwei/LICENSE`. The engine uses the MIT-licensed `iztro` and `lunar-javascript` packages. Their notices are displayed in the app and embedded in both the PWA shell and single-file HTML. No dataset or interpretation corpus is bundled.
