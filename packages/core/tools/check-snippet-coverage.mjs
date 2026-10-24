import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { computeNatal } from "../dist/engine.js";
import { evaluateCoverage, prepareContent, serializeShard } from "./snippets.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputDirectory = join(root, "data", "authoring");
const outputDirectory = join(root, "dist", "snippets");
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const [sources, snippets, samples, dimensionPalaces] = await Promise.all([
  readJson(join(inputDirectory, "sources.json")),
  readJson(join(inputDirectory, "snippets.json")),
  readJson(join(inputDirectory, "samples.json")),
  readJson(join(inputDirectory, "dimensions.json")),
]);
const coverage = evaluateCoverage(prepareContent(sources, snippets), samples, computeNatal, dimensionPalaces);

await writeFile(join(outputDirectory, "coverage-report.json"), serializeShard(coverage), "utf8");
const manifestPath = join(outputDirectory, "manifest.json");
const manifest = await readJson(manifestPath);
manifest.gates.coverage = coverage.status;
const prerequisitesPass = manifest.gates.sourceRights === "pass" && manifest.gates.payloadSize === "pass";
manifest.gates.contentReady = !prerequisitesPass || coverage.status === "not-evaluated" || coverage.status === "fail"
  ? "blocked"
  : coverage.status === "pass" ? "pass" : "partial";
await writeFile(manifestPath, serializeShard(manifest), "utf8");

console.log(`Coverage gate: ${coverage.status}. Content readiness: ${manifest.gates.contentReady}.`);
if (coverage.status === "not-evaluated") {
  console.log(coverage.reason);
} else {
  console.log(`Major-star matrix: ${coverage.matrixCovered}/${coverage.matrixExpected} (${coverage.matrixCoveragePercent}%). Scope: ${coverage.scope}.`);
  for (const dimension of coverage.dimensions) {
    console.log(`${dimension.dimension} (${dimension.palace}): matrix ${dimension.matrixCovered}/${dimension.matrixExpected}, sample charts ${dimension.sampleCovered}/${dimension.sampleExpected}`);
    if (dimension.matrixMissingStars.length > 0) console.log(`  Missing stars: ${dimension.matrixMissingStars.join(", ")}`);
  }
}
if (coverage.status === "fail") process.exitCode = 1;
