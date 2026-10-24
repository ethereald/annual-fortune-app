import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DATA_VERSION,
  MAX_COMPRESSED_BYTES,
  SCHOOL_SETTING,
  measurePayload,
  prepareContent,
  serializeShard,
} from "./snippets.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputDirectory = join(root, "data", "authoring");
const outputDirectory = join(root, "dist", "snippets");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

const content = prepareContent(
  await readJson(join(inputDirectory, "sources.json")),
  await readJson(join(inputDirectory, "snippets.json")),
);
const files = {};

for (const dimension of content.dimensions) {
  const entries = content.interpretations
    .filter((entry) => entry.dimension === dimension)
    .map(({ kind, ...entry }) => entry);
  files[`${dimension}.json`] = serializeShard({
    dataVersion: DATA_VERSION,
    schoolSetting: SCHOOL_SETTING,
    dimension,
    entries,
  });
}
files["classics.json"] = serializeShard({
  dataVersion: DATA_VERSION,
  schoolSetting: SCHOOL_SETTING,
  entries: content.classics,
});

const payloadSize = measurePayload(files);
const sourceGate = content.sources.length > 0 ? "pass" : "blocked";
const sizeGate = payloadSize.compressedBytes <= MAX_COMPRESSED_BYTES ? "pass" : "fail";
const manifest = {
  dataVersion: DATA_VERSION,
  schoolSetting: SCHOOL_SETTING,
  datasetVersion: content.sources.map((source) => source.version).join("; ") || null,
  sources: content.sources,
  dimensions: content.dimensions,
  shards: payloadSize.shards,
  payloadSize: {
    uncompressedBytes: payloadSize.uncompressedBytes,
    compressedBytes: payloadSize.compressedBytes,
    maxCompressedBytes: MAX_COMPRESSED_BYTES,
    manifestExcluded: true,
  },
  gates: {
    sourceRights: sourceGate,
    payloadSize: sizeGate,
    coverage: content.interpretations.length === 0 ? "not-evaluated" : "pending",
    contentReady: sourceGate === "pass" && sizeGate === "pass" && content.dimensions.length > 0
      ? "pending"
      : "blocked",
  },
};
files["manifest.json"] = serializeShard(manifest);

await mkdir(outputDirectory, { recursive: true });
for (const [name, contents] of Object.entries(files)) {
  await writeFile(join(outputDirectory, name), contents, "utf8");
}

console.log(`Generated ${Object.keys(files).length} build-time snippet file(s) in ${outputDirectory}.`);
console.log(`Rights gate: ${sourceGate}; compressed payload: ${payloadSize.compressedBytes}/${MAX_COMPRESSED_BYTES} bytes (${sizeGate}).`);
console.log(content.dimensions.length === 0
  ? "Coverage gate: not evaluated (no authorized interpretation dimensions)."
  : "Coverage gate: pending; run npm run snippets:coverage after the shard build.");
if (manifest.gates.contentReady === "blocked") {
  console.log("Content readiness: BLOCKED. No interpretation content is cleared for application use.");
}
if (sizeGate === "fail") process.exitCode = 1;
