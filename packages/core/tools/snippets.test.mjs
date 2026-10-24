import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_COMPRESSED_BYTES,
  evaluateCoverage,
  measurePayload,
  prepareContent,
} from "./snippets.mjs";

const source = {
  id: "approved-source",
  title: "Reviewed source",
  url: "https://example.org/source",
  version: "edition-1",
  license: "CC-BY-4.0",
  attribution: "Attribution text",
  rightsEvidence: "Rights review reference",
  rightsConfirmed: true,
};

const lookup = {
  kind: "interpretation",
  dimension: "career",
  detail: "summary",
  key: { star: "天机", palace: "官禄", brightness: "旺", siHua: null },
  text: "Reviewed test text.",
  sourceId: source.id,
};

test("requires reviewed provenance before accepting content", () => {
  assert.throws(
    () => prepareContent([{ ...source, rightsConfirmed: false }], [lookup]),
    /rightsConfirmed must be true/,
  );
  assert.throws(
    () => prepareContent([{ ...source, url: "http://example.org/source" }], [lookup]),
    /HTTPS URL/,
  );
});

test("deduplicates identical snippets and retains all source attributions", () => {
  const secondSource = { ...source, id: "second-source" };
  const content = prepareContent([source, secondSource], [lookup, { ...lookup, sourceId: secondSource.id }]);
  assert.equal(content.interpretations.length, 1);
  assert.deepEqual(content.interpretations[0].sourceIds, ["approved-source", "second-source"]);
  assert.deepEqual(content.dimensions, ["career"]);
});

test("rejects conflicting text for the same key and detail tier", () => {
  assert.throws(
    () => prepareContent([source], [lookup, { ...lookup, text: "Different text." }]),
    /Conflicting text/,
  );
});

test("rejects lookup keys outside the engine's supported values", () => {
  assert.throws(
    () => prepareContent([source], [{ ...lookup, key: { ...lookup.key, brightness: "unknown" } }]),
    /not a supported school brightness/,
  );
  assert.throws(
    () => prepareContent([source], [{ ...lookup, key: { ...lookup.key, siHua: "unknown" } }]),
    /must be 禄, 权, 科, or 忌/,
  );
});

test("separates classics and interpretation dimensions", () => {
  const classic = {
    kind: "classic",
    detail: "deep",
    work: "Reviewed work",
    reference: "Chapter 1",
    text: "Reviewed excerpt.",
    sourceId: source.id,
  };
  const content = prepareContent([source], [lookup, classic]);
  assert.equal(content.interpretations.length, 1);
  assert.equal(content.classics.length, 1);
});

test("coverage checks the star matrix, falls back to base keys, and reports missing lookups", () => {
  const content = prepareContent([source], [
    { ...lookup, key: { ...lookup.key, brightness: null } },
  ]);
  const samples = [{ id: "sample", request: {} }];
  const computeNatal = () => ({
    chart: {
      palaces: [{
        name: "官禄",
        stars: [
          { name: "天机", type: "major", brightnessRaw: "旺", siHua: "禄" },
          { name: "天同", type: "major", brightnessRaw: "平" },
          { name: "文昌", type: "minor" },
        ],
      }],
    },
  });
  const report = evaluateCoverage(content, samples, computeNatal, { career: "官禄" });
  assert.equal(report.status, "partial");
  assert.equal(report.matrixCovered, 1);
  assert.equal(report.matrixExpected, 14);
  const [career] = report.dimensions;
  assert.equal(career.sampleExpected, 2);
  assert.equal(career.sampleCovered, 1);
  assert.equal(career.sampleMissing[0].star, "天同");
  assert.ok(career.matrixMissingStars.includes("紫微"));
  assert.ok(!career.matrixMissingStars.includes("天机"));
});

test("coverage is not evaluated when no interpretation entries exist", () => {
  const report = evaluateCoverage(prepareContent([], []), [{ id: "sample", request: {} }], () => ({}), { career: "官禄" });
  assert.equal(report.status, "not-evaluated");
});

test("measures compressed shard payloads against the agreed cap", () => {
  const size = measurePayload({ "career.json": "short content\n" });
  assert.ok(size.uncompressedBytes > 0);
  assert.ok(size.compressedBytes > 0);
  assert.equal(MAX_COMPRESSED_BYTES, 15 * 1024 * 1024);
});
