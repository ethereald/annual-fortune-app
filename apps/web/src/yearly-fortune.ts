import type { AnnualCalculation, NatalCalculation } from "@annual-fortune/core";
import { normalizePalaceName, toTW } from "./zh";

export type Tone = "favorable" | "steady" | "careful";

export interface AreaFortune {
  area: string;
  label: string;
  tone: Tone;
  toneLabel: string;
  text: string;
}

export interface MonthFortune {
  title: string;
  solarRange: string;
  tone: Tone;
  toneLabel: string;
  text: string;
}

export interface YearlyFortune {
  headline: string;
  overview: string;
  transformations: { title: string; text: string }[];
  areas: AreaFortune[];
  months: MonthFortune[];
}

const MONTH_NAMES = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];

function buildMonths(annual: AnnualCalculation, palaces: PalaceView[]): MonthFortune[] {
  return annual.months.map((month) => {
    const focus = palaces.find((palace) => palace.branch === month.palaceIndex);
    const focusInfo = focus ? AREAS[focus.natalName] : undefined;
    const lands = month.transformations.flatMap(({ type: rawType, star }) => {
      const type = toTW(rawType) as Trans;
      const starName = toTW(star);
      const palace = palaces.find((candidate) => candidate.allStars.includes(starName));
      if (!palace || !TRANS_INFO[type]) return [];
      const area = normalizePalaceName(month.palaceNames[palace.branch] ?? "");
      return [{ type, star: starName, area }];
    });

    let score = 0;
    for (const land of lands) {
      score += land.type === "祿" || land.type === "科" ? 1 : land.type === "權" ? 0.5 : -1.5;
    }
    const tone: Tone = score >= 1 ? "favorable" : score < 0 ? "careful" : "steady";

    const parts = [`本月重心落在${focusInfo?.topic ?? "自身"}方面。`];
    const good = lands.filter((land) => land.type !== "忌" && AREAS[land.area]);
    const bad = lands.filter((land) => land.type === "忌" && AREAS[land.area]);
    for (const land of good) {
      parts.push(`${land.star}${TRANS_INFO[land.type].name}帶動${AREAS[land.area]?.label}：${TRANS_AREA[land.type][land.area]}`);
    }
    for (const land of bad) {
      parts.push(`${land.star}化忌落在${AREAS[land.area]?.label}：${TRANS_AREA.忌[land.area]}`);
    }
    if (lands.length === 0) parts.push("本月四化未明顯引動，宜按部就班。");

    return {
      title: `農曆${month.lunarMonth < 0 ? "閏" : ""}${MONTH_NAMES[Math.abs(month.lunarMonth) - 1]}月（${month.heavenlyStem ? toTW(month.heavenlyStem + month.earthlyBranch) : ""}月）`,
      solarRange: `西曆 ${month.solarStart.replaceAll("-", "/")} – ${month.solarEnd.replaceAll("-", "/")}`,
      tone,
      toneLabel: TONE_LABELS[tone],
      text: parts.join("").replaceAll("今年", "本月").replaceAll("一年", "這個月"),
    };
  });
}

const STAR_TRAITS: Record<string, string> = {
  紫微: "重視尊嚴與主導權，擅長統籌全局",
  天機: "思路靈活，愛分析也容易多慮",
  太陽: "外向主動，樂於付出並受人矚目",
  武曲: "務實果斷，重視實際成果與財務",
  天同: "性情溫和，求安穩與生活享受",
  廉貞: "企圖心強，講究原則，也牽涉感情與是非",
  天府: "穩健保守，擅長守成與累積",
  太陰: "細膩內斂，重視積蓄與居家",
  貪狼: "慾望多、人緣佳，興趣與交際廣泛",
  巨門: "口才好、愛鑽研，須留意口舌是非",
  天相: "重信義、擅輔佐協調，替人把關",
  天梁: "具蔭庇與照顧人的特質，重原則",
  七殺: "衝勁十足，獨立敢闖，起伏也較大",
  破軍: "敢於破舊立新，變動與突破並行",
};

interface AreaInfo {
  label: string;
  topic: string;
  intro: string;
}

const AREAS: Record<string, AreaInfo> = {
  命: { label: "整體運勢", topic: "自身狀態", intro: "流年命宮代表你今年的整體狀態與處世重心。" },
  兄弟: { label: "手足同儕", topic: "手足、同事與合作夥伴", intro: "此宮反映手足、同輩與合作關係，也牽動現金流動。" },
  夫妻: { label: "感情婚姻", topic: "感情與伴侶關係", intro: "此宮反映感情、婚姻與親密關係的互動。" },
  子女: { label: "子女晚輩", topic: "子女、晚輩與創作", intro: "此宮反映子女、晚輩、學生，以及創作與投資的運勢。" },
  財帛: { label: "財運收入", topic: "收入與理財", intro: "此宮反映收入來源、理財與花費習慣。" },
  疾厄: { label: "健康體質", topic: "身心健康", intro: "此宮反映身體狀況與生活作息。僅為參考，健康問題請諮詢專業醫師。" },
  遷移: { label: "外出發展", topic: "外出、旅行與環境變動", intro: "此宮反映外出、搬遷、出差與外在機遇。" },
  交友: { label: "人際貴人", topic: "朋友、下屬與人際網絡", intro: "此宮反映朋友、客戶、下屬與人際助力。" },
  官祿: { label: "事業學業", topic: "工作、事業與學業", intro: "此宮反映工作表現、事業發展與學業狀況。" },
  田宅: { label: "家宅不動產", topic: "居家、不動產與家庭環境", intro: "此宮反映住家、不動產與家庭氣氛。" },
  福德: { label: "心境福氣", topic: "心情、興趣與福氣", intro: "此宮反映精神生活、情緒調適與休閒享受。" },
  父母: { label: "長輩文書", topic: "長輩、上司與文書證件", intro: "此宮反映與長輩、上司的關係，以及合約、證件與考試等文書事務。" },
};

const AREA_ORDER = ["命", "官祿", "財帛", "夫妻", "疾厄", "交友", "遷移", "田宅", "福德", "父母", "兄弟", "子女"];

type Trans = "祿" | "權" | "科" | "忌";

const TRANS_INFO: Record<Trans, { name: string; meaning: string }> = {
  祿: { name: "化祿", meaning: "代表機會、緣分與收穫" },
  權: { name: "化權", meaning: "代表主導、掌控與承擔責任" },
  科: { name: "化科", meaning: "代表名聲、貴人與順利平穩" },
  忌: { name: "化忌", meaning: "代表阻滯、牽掛與需要多留意" },
};

const TRANS_AREA: Record<Trans, Record<string, string>> = {
  祿: {
    命: "今年人緣與機運較佳，主動爭取容易有收穫，整體心情開朗。",
    兄弟: "與手足、同儕、合作夥伴互動熱絡，合作機會增加，資金流通順暢。",
    夫妻: "感情有進展的機會，單身者易遇良緣，已有伴者感情融洽。",
    子女: "與子女晚輩緣分好，創作、投資或新計畫有收穫的機會。",
    財帛: "財運有利，收入增加或有額外進帳，是把握理財機會的一年。",
    疾厄: "體況尚稱穩定，但也容易因應酬或飲食放縱而增加負擔，宜節制。",
    遷移: "外出、出差或到新環境發展容易遇到機會，人脈向外拓展。",
    交友: "朋友與人脈帶來助力，適合擴展社交圈與尋求合作。",
    官祿: "事業與學業進展順利，有升遷、加薪或新機會的跡象，適合積極表現。",
    田宅: "家庭氣氛和諧，置產、搬家或整修居家環境較有利。",
    福德: "心境愉快，享受生活的機會多，興趣與休閒帶來滿足感。",
    父母: "與長輩、上司關係融洽，文書、考試與合約事務較順利，易得支持。",
  },
  權: {
    命: "今年主導意識強，有能力承擔更大責任，但需留意過於強勢。",
    兄弟: "在合作與同儕關係中掌握主導權，需注意別與夥伴爭權。",
    夫妻: "感情中較有主見，彼此宜多溝通，避免控制慾或意見相左。",
    子女: "對子女晚輩管教積極，創作與投資上想要大展身手。",
    財帛: "對財務有掌控力，適合主動規劃與經營，但避免過度冒進。",
    疾厄: "體力與行動力充沛，但容易硬撐，勿因工作過勞而忽略休息。",
    遷移: "外出發展有企圖心，能在外在環境中爭取較有影響力的位置。",
    交友: "在人際網絡中具號召力，帶領團隊容易，但須顧及他人感受。",
    官祿: "事業上掌握實權、擔任要角的機會多，適合爭取重要職務與挑戰。",
    田宅: "家中事務由你主導，適合規劃置產或改造居家，需顧及家人意見。",
    福德: "意志堅定、想法多，容易給自己壓力，宜保留放鬆的空間。",
    父母: "與長輩或上司有較多要求與互動，文書事務需親自把關。",
  },
  科: {
    命: "形象與名聲有提升機會，逢事易有貴人相助，能平穩度過難關。",
    兄弟: "與手足、同事相處和善，合作穩定，遇事有人協助。",
    夫妻: "感情平順、相處有禮，適合透過長輩、朋友介紹認識對象。",
    子女: "與晚輩緣分平和，適合學習、進修與有條理地經營創作。",
    財帛: "財運平穩，靠專業與口碑獲利，適合穩健理財而非投機。",
    疾厄: "身體狀況較易化解，有定期檢查與保養的好時機。",
    遷移: "外出順利，容易得到外在的肯定與協助，利於進修或交流。",
    交友: "容易遇到貴人與良友，口碑佳，適合經營人脈。",
    官祿: "事業與學業表現受到肯定，利於考試、證照、進修與提升專業名聲。",
    田宅: "居家安穩，家庭氣氛平和，適合整理與布置家居。",
    福德: "心情平和、有書卷氣，適合學習新知與培養興趣。",
    父母: "考試、文件與申請順利，容易得到長輩與上司的賞識和提攜。",
  },
  忌: {
    命: "今年容易鑽牛角尖或自我設限，凡事宜多思量、放慢腳步，避免衝動決定。",
    兄弟: "與手足、同事或合作夥伴易有摩擦，資金往來要謹慎，避免擔保或借貸。",
    夫妻: "感情中容易有誤會或心結，宜多體諒、坦誠溝通，勿因小事冷戰。",
    子女: "與晚輩溝通需耐心，創作與投資不宜貿然加碼，量力而為。",
    財帛: "財務需要保守，避免高風險投資、大額借貸與衝動消費，開銷宜設上限。",
    疾厄: "留意身體與作息，壓力與疲勞易累積，有不適應及早就醫檢查。",
    遷移: "外出、旅行或搬遷多留意安全與行程安排，在外勿逞強或與人起衝突。",
    交友: "人際上容易受朋友或下屬牽累，交友與合夥需審慎，慎防是非。",
    官祿: "工作或課業壓力較大，進度易有阻滯，轉職與創業宜充分評估，穩紮穩打。",
    田宅: "居家與不動產事務需多留意，置產、搬遷或整修宜審慎規劃，家人間多溝通。",
    福德: "思慮多、容易煩心或失眠，建議培養紓壓管道，不宜鑽牛角尖。",
    父母: "文書、合約與證件需仔細核對，與長輩或上司溝通宜委婉，避免因疏忽生變。",
  },
};

const TONE_LABELS: Record<Tone, string> = {
  favorable: "機會較多",
  steady: "平穩",
  careful: "宜謹慎",
};

function traitsOf(names: string[]): string {
  return names
    .filter((name) => STAR_TRAITS[name])
    .map((name) => `${name}（${STAR_TRAITS[name]}）`)
    .join("；");
}

interface PalaceView {
  branch: number;
  natalName: string;
  annualName: string;
  majors: string[];
  allStars: string[];
}

function buildPalaces(natal: NatalCalculation, annual: AnnualCalculation): PalaceView[] {
  return natal.chart.palaces.map((palace) => ({
    branch: palace.branch,
    natalName: normalizePalaceName(palace.name),
    annualName: normalizePalaceName(annual.palaceNames[palace.branch] ?? ""),
    majors: palace.stars.filter((star) => star.type === "major").map((star) => toTW(star.name)),
    allStars: palace.stars.map((star) => toTW(star.name)),
  }));
}

function describeStars(view: PalaceView, byBranch: Map<number, PalaceView>): { names: string[]; borrowed: boolean } {
  if (view.majors.length > 0) return { names: view.majors, borrowed: false };
  const opposite = byBranch.get((view.branch + 6) % 12);
  return { names: opposite?.majors ?? [], borrowed: true };
}

export function buildYearlyFortune(natal: NatalCalculation, annual: AnnualCalculation): YearlyFortune {
  const palaces = buildPalaces(natal, annual);
  const byBranch = new Map(palaces.map((palace) => [palace.branch, palace]));
  const byAnnualName = new Map(palaces.map((palace) => [palace.annualName, palace]));

  const landings = annual.transformations.flatMap(({ type: rawType, star }) => {
    const type = toTW(rawType) as Trans;
    const starName = toTW(star);
    const palace = palaces.find((candidate) => candidate.allStars.includes(starName));
    return palace && TRANS_INFO[type] ? [{ type, star: starName, palace }] : [];
  });

  const areaFortunes = new Map<string, AreaFortune>();
  for (const area of AREA_ORDER) {
    const view = byAnnualName.get(area);
    const info = AREAS[area];
    if (!view || !info) continue;
    const { names, borrowed } = describeStars(view, byBranch);
    const here = landings.filter((landing) => landing.palace.branch === view.branch);

    let score = 0;
    for (const landing of here) {
      score += landing.type === "祿" || landing.type === "科" ? 1 : landing.type === "權" ? 0.5 : -1.5;
    }
    const tone: Tone = score >= 1 ? "favorable" : score < 0 ? "careful" : "steady";

    const parts: string[] = [info.intro];
    if (names.length > 0) {
      parts.push(
        `${borrowed ? "此宮無主星，參考對宮" : "此宮位的星曜為"}${traitsOf(names)}。`,
      );
    }
    if (here.length === 0) {
      parts.push(`今年沒有四化直接引動此領域，整體依個人努力與既有基礎發展，運勢以平穩為主。`);
    } else {
      for (const landing of here) {
        parts.push(`${landing.star}${TRANS_INFO[landing.type].name}進入此宮：${TRANS_AREA[landing.type][area]}`);
      }
    }
    areaFortunes.set(area, { area, label: info.label, tone, toneLabel: TONE_LABELS[tone], text: parts.join("") });
  }

  const lifeView = byAnnualName.get("命");
  const lifeStars = lifeView ? describeStars(lifeView, byBranch) : { names: [], borrowed: false };
  const headline = `${annual.year} 年流年命宮落在本命${lifeView?.natalName ?? "—"}宮`;
  const overviewParts = [
    `${headline}，今年的生活重心會偏向「${lifeView ? (AREAS[lifeView.natalName]?.topic ?? "自身") : "自身"}」相關的事務。`,
  ];
  if (lifeStars.names.length > 0) {
    overviewParts.push(
      `${lifeStars.borrowed ? "該宮無主星，參考對宮" : "該宮位坐有"}${traitsOf(lifeStars.names)}。這些特質在今年會比較明顯。`,
    );
  }
  const favorable = [...areaFortunes.values()].filter((item) => item.tone === "favorable").map((item) => item.label);
  const careful = [...areaFortunes.values()].filter((item) => item.tone === "careful").map((item) => item.label);
  if (favorable.length > 0) overviewParts.push(`相對有機會的領域：${favorable.join("、")}。`);
  if (careful.length > 0) overviewParts.push(`需要多留意的領域：${careful.join("、")}。`);
  if (favorable.length === 0 && careful.length === 0) overviewParts.push("今年沒有特別突出的起伏，宜按部就班。");

  const transformations = landings.map((landing) => {
    const area = landing.palace.annualName;
    const info = AREAS[area];
    return {
      title: `${landing.star}${TRANS_INFO[landing.type].name}・${info?.label ?? area}`,
      text: `${TRANS_INFO[landing.type].name}${TRANS_INFO[landing.type].meaning}，今年落在${info?.topic ?? area}方面。${TRANS_AREA[landing.type][area] ?? ""}`,
    };
  });

  return {
    headline,
    overview: overviewParts.join(""),
    transformations,
    areas: AREA_ORDER.flatMap((area) => {
      const item = areaFortunes.get(area);
      return item ? [item] : [];
    }),
    months: buildMonths(annual, palaces),
  };
}

export function fortuneToMarkdown(fortune: YearlyFortune, year: number, level: "summary" | "standard" | "deep"): string[] {
  const lines = [`## ${year} 年運程解讀`, "", fortune.overview, ""];
  if (fortune.transformations.length > 0) {
    lines.push("### 今年的關鍵引動（流年四化）", "");
    for (const item of fortune.transformations) lines.push(`- **${item.title}**：${item.text}`);
    lines.push("");
  }
  if (level !== "summary") {
    lines.push("### 各領域運程", "");
    for (const item of fortune.areas) lines.push(`#### ${item.label}（${item.toneLabel}）`, "", item.text, "");
  }
  if (level === "deep") {
    lines.push("### 逐月運程", "");
    for (const item of fortune.months) lines.push(`#### ${item.title}（${item.toneLabel}）`, "", `_${item.solarRange}_`, "", item.text, "");
  }
  return lines;
}
