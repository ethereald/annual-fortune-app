import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createZstdDecompress } from "node:zlib";

// Build-time miner for the CC BY 4.0 Ziwei Doushu interpretation dataset v4.0.
// Usage: node tools/mine-dataset.mjs <year-YYYY.jsonl.zst> [SHA256SUMS.txt]
// Any text that mentions the excluded 倪海厦《天纪》 quotes or engine-derived 倪师 blocks is dropped, never edited.

export const SOURCE_ID = "ziwei-doushu-interp-v4";
const MAJOR_STARS = ["紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府", "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军"];
const EXCLUDED = /倪|天纪|关键推导|断法|解厄|词义|〔|《紫微斗数全书》卷二十二/;
const CLASSIC_LINE = /^·\s*《紫微斗数全书·([^》]+)》([^：:「」]*)[：:]「([^」]+)」/;

export function splitSections(text) {
  const parts = text.split(/\*\*【([^】]+)】\*\*/);
  const sections = new Map();
  for (let index = 1; index < parts.length; index += 2) {
    if (!sections.has(parts[index])) sections.set(parts[index], parts[index + 1].trim());
  }
  return sections;
}

export function matchSingleStarLead(paragraph, palaceName) {
  const palace = palaceName.replace(/宫$/, "");
  for (const star of MAJOR_STARS) {
    if (new RegExp(`^${palace}宫${star}[，,。]`).test(paragraph)) return star;
    if (new RegExp(`^你的${palace}宫是${star}[，,。]`).test(paragraph)) return star;
    if (new RegExp(`^${star}(坐|在|入)${palace}宫?[，,]`).test(paragraph)) return star;
    if (palace === "命" && new RegExp(`^${star}(坐|守)命(宫)?的人`).test(paragraph)) return star;
  }
  return null;
}

export function firstSentence(paragraph) {
  const end = paragraph.indexOf("。");
  return end === -1 ? paragraph : paragraph.slice(0, end + 1);
}

export function isCleanParagraph(paragraph) {
  return paragraph.length > 0 && !EXCLUDED.test(paragraph) && !paragraph.startsWith("·") && !paragraph.startsWith("**");
}

export async function mine(lines, dimensionPalaces) {
  const leads = new Map();
  const classics = new Map();
  const stats = { charts: 0, droppedExcludedLeads: 0, droppedClassicsExcluded: 0 };

  for await (const line of lines) {
    const record = JSON.parse(line);
    stats.charts += 1;
    for (const [dimension, palace] of Object.entries(dimensionPalaces)) {
      const text = record.c?.[dimension];
      if (typeof text !== "string") continue;
      const sections = splitSections(text);
      const body = sections.get("核心论断");
      if (body) {
        const paragraphs = body.split(/\n\n+/).map((paragraph) => paragraph.trim());
        const star = matchSingleStarLead(paragraphs[0] ?? "", palace);
        if (star) {
          const key = `${dimension}|${star}`;
          let entry = leads.get(key);
          if (!entry) leads.set(key, entry = { dimension, star, palace, variants: new Map() });
          const lead = paragraphs[0];
          let variant = entry.variants.get(lead);
          if (!variant) entry.variants.set(lead, variant = { count: 0, followers: new Map() });
          variant.count += 1;
          for (const follower of paragraphs.slice(1)) {
            variant.followers.set(follower, (variant.followers.get(follower) ?? 0) + 1);
          }
        }
      }
      const references = sections.get("经典出处");
      if (references) {
        for (const referenceLine of references.split("\n")) {
          const match = CLASSIC_LINE.exec(referenceLine.trim());
          if (!match) continue;
          const reference = `${match[1]}${match[2] ? `·${match[2].trim()}` : ""}`;
          const quote = match[3].trim();
          if (EXCLUDED.test(quote) || EXCLUDED.test(reference)) {
            stats.droppedClassicsExcluded += 1;
            continue;
          }
          const existing = classics.get(reference);
          if (!existing) classics.set(reference, { texts: new Set([quote]) });
          else existing.texts.add(quote);
        }
      }
    }
  }

  const report = { ...stats, interpretationKeys: [], skipped: [], classics: { accepted: 0, ambiguous: [] } };
  const snippets = [];

  for (const entry of [...leads.values()].sort((a, b) => a.dimension.localeCompare(b.dimension) || a.star.localeCompare(b.star))) {
    const label = `${entry.dimension}/${entry.palace}/${entry.star}`;
    const cleanVariants = [...entry.variants].filter(([lead]) => isCleanParagraph(lead));
    if (entry.variants.size > 1) {
      report.skipped.push({ key: label, reason: "ambiguous lead text across charts" });
      continue;
    }
    if (cleanVariants.length === 0) {
      stats.droppedExcludedLeads += 1;
      report.skipped.push({ key: label, reason: "lead paragraph contains excluded 倪师 material" });
      continue;
    }
    const [lead, variant] = cleanVariants[0];
    const universalFollowers = [...variant.followers]
      .filter(([paragraph, count]) => count === variant.count && isCleanParagraph(paragraph))
      .map(([paragraph]) => paragraph);
    const key = { star: entry.star, palace: entry.palace, brightness: null, siHua: null };
    const base = { kind: "interpretation", dimension: entry.dimension, key, sourceId: SOURCE_ID };
    snippets.push({ ...base, detail: "summary", text: firstSentence(lead) });
    snippets.push({ ...base, detail: "standard", text: lead });
    if (universalFollowers.length > 0) {
      snippets.push({ ...base, detail: "deep", text: [lead, ...universalFollowers].join("\n\n") });
    }
    report.interpretationKeys.push(label);
  }

  for (const [reference, entry] of [...classics].sort(([a], [b]) => a.localeCompare(b))) {
    if (entry.texts.size > 1) {
      report.classics.ambiguous.push(reference);
      continue;
    }
    snippets.push({
      kind: "classic",
      detail: "deep",
      work: "紫微斗数全书",
      reference,
      text: [...entry.texts][0],
      sourceId: SOURCE_ID,
    });
    report.classics.accepted += 1;
  }

  return { snippets, report };
}

async function main() {
  const [datasetFile, checksumFile] = process.argv.slice(2);
  if (!datasetFile) throw new Error("Usage: node tools/mine-dataset.mjs <year-YYYY.jsonl.zst> [SHA256SUMS.txt]");
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const authoring = join(root, "data", "authoring");
  const dimensionPalaces = JSON.parse(await readFile(join(authoring, "dimensions.json"), "utf8"));

  const hash = createHash("sha256");
  const lines = createInterface({
    input: createReadStream(datasetFile)
      .on("data", (chunk) => hash.update(chunk))
      .pipe(createZstdDecompress()),
    crlfDelay: Infinity,
  });
  const { snippets, report } = await mine(lines, dimensionPalaces);
  const digest = hash.digest("hex");
  const fileName = datasetFile.split(/[\\/]/).pop();

  if (checksumFile) {
    const sums = await readFile(checksumFile, "utf8");
    const expected = sums.split(/\r?\n/).map((row) => row.trim().split(/\s+/)).find(([, name]) => name === fileName)?.[0];
    if (expected !== digest) throw new Error(`Checksum mismatch for ${fileName}: expected ${expected}, got ${digest}.`);
  }

  const source = {
    id: SOURCE_ID,
    title: "紫微斗数开源解读数据集 v4.0 (Ziwei Doushu open interpretation dataset v4.0)",
    url: "https://github.com/Renhuai123/ziwei-doushu/releases/tag/v4.0-13d",
    version: `v4.0-13d, content version ca268829f7a9, ${fileName} sha256 ${digest}`,
    license: "CC BY 4.0 (dataset). Quoted 倪海厦《天纪》 text is excluded from the grant and is not used. 《紫微斗数全书》 classical text is public domain.",
    attribution: "本项目使用了 紫微斗数开源解读数据集 v4.0（674,976 张命盘 × 13 维）。来源：https://github.com/Renhuai123/ziwei-doushu 作者：王多鱼AI",
    rightsEvidence: "https://raw.githubusercontent.com/Renhuai123/ziwei-doushu/main/DATASET-LICENSE: free use including commercial use with attribution; scope covers release tag v4.0-13d; 古籍原文 public domain; 倪师 quotes excluded.",
    rightsConfirmed: true,
  };

  await writeFile(join(authoring, "sources.json"), `${JSON.stringify([source], null, 2)}\n`, "utf8");
  await writeFile(join(authoring, "snippets.json"), `${JSON.stringify(snippets, null, 2)}\n`, "utf8");
  await writeFile(join(authoring, "mining-report.json"), `${JSON.stringify({ file: fileName, sha256: digest, ...report }, null, 2)}\n`, "utf8");
  console.log(`Mined ${snippets.length} snippet record(s) from ${report.charts} charts (${report.interpretationKeys.length} interpretation keys, ${report.classics.accepted} classics).`);
  console.log(`Skipped ${report.skipped.length} interpretation key(s); see data/authoring/mining-report.json.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
