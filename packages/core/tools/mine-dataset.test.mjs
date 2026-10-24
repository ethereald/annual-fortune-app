import assert from "node:assert/strict";
import test from "node:test";
import { firstSentence, isCleanParagraph, matchSingleStarLead, mine, splitSections } from "./mine-dataset.mjs";

const dimensions = { career: "官禄宫", health: "疾厄宫", overview: "命宫" };

function chart(content) {
  return JSON.stringify({ k: "x", c: content });
}

async function* toLines(values) {
  for (const value of values) yield value;
}

test("matches only single-star leads for the dimension's palace", () => {
  assert.equal(matchSingleStarLead("官禄宫天机，适合策划。", "官禄宫"), "天机");
  assert.equal(matchSingleStarLead("天同坐官禄宫，稳定。", "官禄宫"), "天同");
  assert.equal(matchSingleStarLead("你的疾厄宫是天同。《全书》说。", "疾厄宫"), "天同");
  assert.equal(matchSingleStarLead("天同守命的人性情温和。", "命宫"), "天同");
  assert.equal(matchSingleStarLead("武曲天相坐官禄宫，管钱。", "官禄宫"), null);
  assert.equal(matchSingleStarLead("夫妻宫天机，其他。", "官禄宫"), null);
});

test("excludes 倪师 material and engine-derived blocks", () => {
  assert.equal(isCleanParagraph("古书说天相入庙。"), true);
  assert.equal(isCleanParagraph("倪师讲天相（倪海厦《天纪》第11集）。"), false);
  assert.equal(isCleanParagraph("**关键推导**（倪师断法引擎）"), false);
  assert.equal(isCleanParagraph("· 列表项"), false);
});

test("splits sections and takes the first sentence", () => {
  const sections = splitSections("**【一句话定调】**\n\n甲。\n\n**【核心论断】**\n\n乙。");
  assert.equal(sections.get("一句话定调"), "甲。");
  assert.equal(firstSentence("第一句。第二句。"), "第一句。");
});

test("mines clean keys, skips excluded or ambiguous ones, and keeps public-domain classics", async () => {
  const clean = chart({
    career: "**【核心论断】**\n\n官禄宫天机，适合策划与研究。多变是特点。\n\n额外说明段。\n\n**【经典出处】**\n\n· 《紫微斗数全书·卷二·官禄》天机条：「天机善谈兵」",
    health: "**【核心论断】**\n\n你的疾厄宫是天同。要多运动。",
    overview: "**【核心论断】**\n\n天梁守命的人稳重。倪师说天梁是荫星（倪海厦《天纪》第1集）。",
  });
  const second = chart({
    career: "**【核心论断】**\n\n官禄宫天机，适合策划与研究。多变是特点。\n\n额外说明段。\n\n**【经典出处】**\n\n· 《紫微斗数全书·卷二·官禄》天机条：「天机善谈兵」",
    health: "**【核心论断】**\n\n你的疾厄宫是天同。要多运动。\n\n只在一张盘出现的段。",
  });
  const { snippets, report } = await mine(toLines([clean, second]), dimensions);

  const careerDeep = snippets.find((entry) => entry.dimension === "career" && entry.detail === "deep");
  assert.equal(careerDeep.text, "官禄宫天机，适合策划与研究。多变是特点。\n\n额外说明段。");
  assert.equal(snippets.find((entry) => entry.dimension === "career" && entry.detail === "summary").text, "官禄宫天机，适合策划与研究。");
  assert.equal(snippets.filter((entry) => entry.dimension === "health").length, 2);
  assert.equal(snippets.some((entry) => entry.dimension === "overview"), false);
  assert.ok(report.skipped.some((entry) => entry.reason.includes("倪师")));
  assert.deepEqual(snippets.find((entry) => entry.kind === "classic"), {
    kind: "classic",
    detail: "deep",
    work: "紫微斗数全书",
    reference: "卷二·官禄·天机条",
    text: "天机善谈兵",
    sourceId: "ziwei-doushu-interp-v4",
  });
});
