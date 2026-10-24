# Snippet authoring inputs

Content here is generated from reviewed, redistributable source material. Nothing is invented: keys without clean source text are reported as missing.

## Files

- `sources.json`: source records with license, attribution and rights evidence. Every record must set `rightsConfirmed: true`, which is only valid after a human has verified the license for the exact material.
- `snippets.json`: interpretation and classical-reference records. Produced by `npm run snippets:mine`.
- `dimensions.json`: maps each interpretation dimension to the palace it describes (for example `career` is `官禄宫`).
- `samples.json`: representative `FortuneRequest` fixtures used by the coverage check.
- `mining-report.json`: what the miner accepted and skipped, plus the dataset file checksum.

## Current source

[紫微斗数开源解读数据集 v4.0](https://github.com/Renhuai123/ziwei-doushu/releases/tag/v4.0-13d) (release `v4.0-13d`, content version `ca268829f7a9`), licensed CC BY 4.0 for free use including commercial use, with attribution. The terms are in its [DATASET-LICENSE](https://raw.githubusercontent.com/Renhuai123/ziwei-doushu/main/DATASET-LICENSE).

- The dataset lists quoted 倪海厦《天纪》 text as outside the grant, so the miner drops any paragraph that mentions 倪师/《天纪》 or comes from the 倪师断法 engine blocks. It never edits such text.
- 《紫微斗数全书》 text is public domain and is kept as `classics.json` entries.
- The dataset was produced by an engine commit (`c25dd495`) different from the one pinned for this app's chart engine (`1059c347`). The interpretation text is keyed by star and palace only, not by engine output, so this does not change which snippet a chart looks up; it should be rechecked if the engine pin changes.

## Mining

```sh
gh release download v4.0-13d --repo Renhuai123/ziwei-doushu -p "year-1990.jsonl.zst" -p "SHA256SUMS.txt"
npm run snippets:mine --workspace @annual-fortune/core -- path/to/year-1990.jsonl.zst path/to/SHA256SUMS.txt
```

The miner verifies the SHA-256 checksum, streams the file (never extracting the full dataset to disk), and needs Node 22.15 or later for built-in zstd. One year file is enough: lookups are deterministic text per star and palace.

Rules:

- Interpretation keys come only from the lead paragraph of a dimension's 核心论断 section when it names exactly one major star in that dimension's palace.
- A key is skipped when its lead text differs between charts, or when the lead contains excluded material.
- `summary` is the first sentence, `standard` is the lead paragraph, and `deep` adds only the following clean paragraphs that appear in every chart with that lead.

## Authoring format

An interpretation record uses `kind: "interpretation"`, a lowercase kebab-case `dimension`, `detail` (`summary`, `standard` or `deep`), `text`, `sourceId`, and a `key` containing `star`, `palace`, `brightness` and `siHua` (use `null` when absent). A classic record uses `kind: "classic"`, `work`, `reference`, `detail`, `text` and `sourceId`.

Identical records for the same key and tier are deduplicated while retaining every source ID. Conflicting text for the same key and tier fails the build.

## Gates

Run `npm run snippets:build` and `npm run snippets:coverage` from the repository root. Outputs go to the ignored `packages/core/dist/snippets` directory and are not wired into the web or single-file bundles.

- **Rights:** passes only when at least one source record is confirmed.
- **Size:** compressed shard payload must stay under 15 MiB (the manifest itself is excluded).
- **Coverage:** checks the full matrix of 14 major stars against each dimension's palace, plus the major stars present in the sample charts. A lookup resolves to the exact key (with brightness and 四化) first, then to the star and palace base key. Minor, lucky and sha stars have no interpretation lookups and are out of scope. The status is `pass`, `partial`, `fail` or `not-evaluated`.
- **Content readiness:** `pass` only when rights, size and coverage all pass; `partial` when rights and size pass but coverage is incomplete; otherwise `blocked`.
