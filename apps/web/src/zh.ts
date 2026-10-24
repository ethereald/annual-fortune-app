import * as OpenCC from "opencc-js/cn2t";

const convert = OpenCC.Converter({ from: "cn", to: "tw" });
const convertPhrases = OpenCC.Converter({ from: "cn", to: "twp" });

/** 簡體轉繁體（字形轉換，用於星名、宮名等專有名詞）。 */
export function toTW(text: string): string {
  return convert(text);
}

/** 簡體轉繁體並套用台灣慣用詞，用於解讀長文。 */
export function proseToTW(text: string): string {
  return convertPhrases(text);
}

export function normalizePalaceName(name: string): string {
  const normalized = toTW(name).replace(/宮$/, "");
  return normalized === "僕役" ? "交友" : normalized;
}
