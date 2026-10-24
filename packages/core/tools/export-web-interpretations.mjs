import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareContent } from "./snippets.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const authoring = join(root, "data", "authoring");
const output = resolve(root, "..", "..", "apps", "web", "src", "interpretations.json");

const sources = JSON.parse(await readFile(join(authoring, "sources.json"), "utf8"));
const snippets = JSON.parse(await readFile(join(authoring, "snippets.json"), "utf8"));
const content = prepareContent(sources, snippets);

const palaceKey = (name) => name.replace(/宫$/, "");
const tiers = { summary: "summary", standard: "standard", deep: "deep" };
const byPalace = {};
for (const entry of content.interpretations) {
  if (entry.key.brightness !== null || entry.key.siHua !== null) continue;
  const palace = palaceKey(entry.key.palace);
  const star = byPalace[palace]?.[entry.key.star] ?? [];
  let item = star.find((candidate) => candidate.dimension === entry.dimension);
  if (!item) {
    item = { dimension: entry.dimension };
    star.push(item);
  }
  item[tiers[entry.detail]] = entry.text;
  (byPalace[palace] ??= {})[entry.key.star] = star;
}

const data = {
  attribution: content.sources.map((source) => source.attribution).filter(Boolean),
  palaces: byPalace,
};
await writeFile(output, `${JSON.stringify(data)}\n`, "utf8");
console.log(`Wrote ${output}: ${Object.values(byPalace).reduce((n, stars) => n + Object.keys(stars).length, 0)} palace/star entries.`);
