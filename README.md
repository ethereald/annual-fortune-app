# Annual Fortune

An offline-first workspace for preparing annual Zi Wei Dou Shu report requests. The web app stores saved profiles in browser storage and includes a PWA build and a single-file HTML build.

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

## Current implementation boundary

The calculation engine, city-coordinate dataset, and licensed interpretation content are not present in this workspace. The app validates report settings and can export a Markdown request summary, but it intentionally does not claim to calculate or interpret a chart yet. Birth details are stored only in the current browser's local storage; there is no application backend.
