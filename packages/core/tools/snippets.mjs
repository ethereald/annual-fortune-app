import { gzipSync } from "node:zlib";

export const DATA_VERSION = "1.0.0";
export const SCHOOL_SETTING = "quanshu";
export const MAX_COMPRESSED_BYTES = 15 * 1024 * 1024;
export const DETAIL_LEVELS = ["summary", "standard", "deep"];

const DIMENSION_PATTERN = /^[a-z][a-z0-9-]*$/;
const SOURCE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
const BRIGHTNESSES = new Set(["庙", "旺", "得", "利", "平", "不", "闲", "陷", "地"]);
const SIHUA_TYPES = new Set(["禄", "权", "科", "忌"]);

function assertString(value, field, context) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${context}.${field} must be a non-empty string.`);
  }
  return value.trim();
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizeLookupKey(key, context) {
  if (!key || typeof key !== "object" || Array.isArray(key)) {
    throw new TypeError(`${context}.key must be an object.`);
  }
  const allowed = new Set(["star", "palace", "brightness", "siHua"]);
  const unexpected = Object.keys(key).filter((field) => !allowed.has(field));
  if (unexpected.length > 0) {
    throw new TypeError(`${context}.key contains unsupported fields: ${unexpected.join(", ")}.`);
  }
  const brightness = key.brightness === undefined || key.brightness === null
    ? null
    : assertString(key.brightness, "key.brightness", context);
  const siHua = key.siHua === undefined || key.siHua === null
    ? null
    : assertString(key.siHua, "key.siHua", context);
  if (brightness !== null && !BRIGHTNESSES.has(brightness)) {
    throw new TypeError(`${context}.key.brightness is not a supported school brightness.`);
  }
  if (siHua !== null && !SIHUA_TYPES.has(siHua)) {
    throw new TypeError(`${context}.key.siHua must be 禄, 权, 科, or 忌.`);
  }
  return {
    star: assertString(key.star, "key.star", context),
    palace: assertString(key.palace, "key.palace", context),
    brightness,
    siHua,
  };
}

export function prepareContent(sources, snippets) {
  if (!Array.isArray(sources) || !Array.isArray(snippets)) {
    throw new TypeError("sources.json and snippets.json must each contain a JSON array.");
  }

  const sourceMap = new Map();
  for (const [index, source] of sources.entries()) {
    const context = `sources[${index}]`;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      throw new TypeError(`${context} must be an object.`);
    }
    const id = assertString(source.id, "id", context);
    if (!SOURCE_ID_PATTERN.test(id)) throw new TypeError(`${context}.id is not a valid source ID.`);
    if (sourceMap.has(id)) throw new TypeError(`Duplicate source ID "${id}".`);
    const url = assertString(source.url, "url", context);
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new TypeError(`${context}.url must be an HTTPS URL.`);
    }
    if (parsedUrl.protocol !== "https:") throw new TypeError(`${context}.url must be an HTTPS URL.`);
    if (source.rightsConfirmed !== true) {
      throw new TypeError(`${context}.rightsConfirmed must be true after human rights review.`);
    }
    sourceMap.set(id, {
      id,
      title: assertString(source.title, "title", context),
      url,
      version: assertString(source.version, "version", context),
      license: assertString(source.license, "license", context),
      attribution: assertString(source.attribution, "attribution", context),
      rightsEvidence: assertString(source.rightsEvidence, "rightsEvidence", context),
      rightsConfirmed: true,
    });
  }

  const interpretations = new Map();
  const classics = new Map();
  for (const [index, snippet] of snippets.entries()) {
    const context = `snippets[${index}]`;
    if (!snippet || typeof snippet !== "object" || Array.isArray(snippet)) {
      throw new TypeError(`${context} must be an object.`);
    }
    const sourceId = assertString(snippet.sourceId, "sourceId", context);
    if (!sourceMap.has(sourceId)) throw new TypeError(`${context} references unknown source "${sourceId}".`);
    if (!DETAIL_LEVELS.includes(snippet.detail)) {
      throw new TypeError(`${context}.detail must be summary, standard, or deep.`);
    }
    const text = assertString(snippet.text, "text", context);

    if (snippet.kind === "interpretation") {
      const dimension = assertString(snippet.dimension, "dimension", context);
      if (!DIMENSION_PATTERN.test(dimension)) {
        throw new TypeError(`${context}.dimension must be a lowercase kebab-case identifier.`);
      }
      const key = normalizeLookupKey(snippet.key, context);
      const identity = stableJson({ dimension, detail: snippet.detail, key });
      const existing = interpretations.get(identity);
      if (existing && existing.text !== text) {
        throw new TypeError(`Conflicting text for ${dimension} lookup ${stableJson(key)} at ${snippet.detail} tier.`);
      }
      if (existing) {
        existing.sourceIds.add(sourceId);
      } else {
        interpretations.set(identity, { kind: "interpretation", dimension, detail: snippet.detail, key, text, sourceIds: new Set([sourceId]) });
      }
    } else if (snippet.kind === "classic") {
      const work = assertString(snippet.work, "work", context);
      const reference = assertString(snippet.reference, "reference", context);
      const identity = stableJson({ detail: snippet.detail, work, reference });
      const existing = classics.get(identity);
      if (existing && existing.text !== text) {
        throw new TypeError(`Conflicting text for classic reference "${work} / ${reference}" at ${snippet.detail} tier.`);
      }
      if (existing) {
        existing.sourceIds.add(sourceId);
      } else {
        classics.set(identity, { kind: "classic", detail: snippet.detail, work, reference, text, sourceIds: new Set([sourceId]) });
      }
    } else {
      throw new TypeError(`${context}.kind must be interpretation or classic.`);
    }
  }

  const orderByDetail = (left, right) => DETAIL_LEVELS.indexOf(left.detail) - DETAIL_LEVELS.indexOf(right.detail);
  const normalizedInterpretations = [...interpretations.values()]
    .map((entry) => ({ ...entry, sourceIds: [...entry.sourceIds].sort() }))
    .sort((left, right) => left.dimension.localeCompare(right.dimension) || stableJson(left.key).localeCompare(stableJson(right.key)) || orderByDetail(left, right));
  const normalizedClassics = [...classics.values()]
    .map((entry) => ({ ...entry, sourceIds: [...entry.sourceIds].sort() }))
    .sort((left, right) => left.work.localeCompare(right.work) || left.reference.localeCompare(right.reference) || orderByDetail(left, right));

  return {
    sources: [...sourceMap.values()].sort((left, right) => left.id.localeCompare(right.id)),
    interpretations: normalizedInterpretations,
    classics: normalizedClassics,
    dimensions: [...new Set(normalizedInterpretations.map((entry) => entry.dimension))].sort(),
  };
}

export function serializeShard(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function measurePayload(files) {
  let uncompressedBytes = 0;
  let compressedBytes = 0;
  const shards = [];
  for (const [name, contents] of Object.entries(files).sort(([left], [right]) => left.localeCompare(right))) {
    const buffer = Buffer.from(contents, "utf8");
    const compressed = gzipSync(buffer, { level: 9 });
    uncompressedBytes += buffer.byteLength;
    compressedBytes += compressed.byteLength;
    shards.push({
      file: name,
      uncompressedBytes: buffer.byteLength,
      compressedBytes: compressed.byteLength,
    });
  }
  return { uncompressedBytes, compressedBytes, shards };
}

export const MAJOR_STARS = [
  "紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府",
  "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军",
];

// A lookup resolves to the exact key first, then to the star + palace base key (no brightness or 四化).
export function resolveInterpretation(index, dimension, key) {
  const exact = index.get(`${dimension}|${stableJson(key)}`);
  if (exact) return exact;
  return index.get(`${dimension}|${stableJson({ star: key.star, palace: key.palace, brightness: null, siHua: null })}`) ?? null;
}

export function evaluateCoverage(content, samples, computeNatal, dimensionPalaces) {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new TypeError("At least one representative chart sample is required.");
  }
  if (!dimensionPalaces || Object.keys(dimensionPalaces).length === 0) {
    throw new TypeError("A dimension-to-palace map is required.");
  }
  if (content.interpretations.length === 0) {
    return {
      status: "not-evaluated",
      reason: "No interpretation entries are present in the authoring input.",
      scope: "major stars only",
      samples: samples.length,
      dimensions: [],
    };
  }

  const index = new Map(content.interpretations.map((entry) => [`${entry.dimension}|${stableJson(entry.key)}`, entry]));
  const charts = samples.map((sample) => ({ id: sample.id, natal: computeNatal(sample.request) }));
  const dimensions = Object.entries(dimensionPalaces).sort(([left], [right]) => left.localeCompare(right)).map(([dimension, palace]) => {
    const missingKeys = MAJOR_STARS
      .map((star) => ({ star, palace, brightness: null, siHua: null }))
      .filter((key) => !resolveInterpretation(index, dimension, key));
    const sampleKeys = new Map();
    for (const { natal } of charts) {
      const palaceData = natal.chart.palaces.find((candidate) => candidate.name.replace(/宫$/, "") === palace.replace(/宫$/, ""));
      for (const star of palaceData?.stars ?? []) {
        if (star.type !== "major") continue;
        const key = { star: star.name, palace, brightness: star.brightnessRaw ?? null, siHua: star.siHua || null };
        sampleKeys.set(stableJson(key), key);
      }
    }
    const sampleMissing = [...sampleKeys.values()].filter((key) => !resolveInterpretation(index, dimension, key));
    return {
      dimension,
      palace,
      matrixExpected: MAJOR_STARS.length,
      matrixCovered: MAJOR_STARS.length - missingKeys.length,
      matrixMissingStars: missingKeys.map((key) => key.star),
      sampleExpected: sampleKeys.size,
      sampleCovered: sampleKeys.size - sampleMissing.length,
      sampleMissing: sampleMissing.slice(0, 20),
    };
  });

  const expected = dimensions.reduce((total, entry) => total + entry.matrixExpected, 0);
  const covered = dimensions.reduce((total, entry) => total + entry.matrixCovered, 0);
  return {
    status: covered === expected ? "pass" : covered === 0 ? "fail" : "partial",
    scope: "major stars only; minor, lucky and sha stars have no interpretation lookups",
    samples: samples.length,
    matrixExpected: expected,
    matrixCovered: covered,
    matrixCoveragePercent: Math.round((covered / expected) * 1000) / 10,
    dimensions,
  };
}
