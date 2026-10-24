import { astro } from "iztro";
import { clockTimeToBranchIndex, validateFortuneRequest } from "./validation.js";
import type { FortuneRequest } from "./types.js";
import { generateChart } from "./ziwei/algorithm.js";
import { type BirthInfo, type ZiweiChart } from "./ziwei/types.js";

export interface NatalCalculation {
  chart: ZiweiChart;
  hourBranch: number;
  hourBranchName: string;
  enteredDate: string;
  chartDate: string;
  lateZishiAdjusted: boolean;
  timeCorrection: "clock-time-only";
}

export interface AnnualCalculation {
  year: number;
  palaceIndex: number;
  palaceNames: string[];
  heavenlyStem: string;
  earthlyBranch: string;
  transformations: { type: "禄" | "权" | "科" | "忌"; star: string }[];
  annualStars: string[][];
  annualDeities: {
    jiangqian12: string[];
    suiqian12: string[];
  };
}

const BRANCH_NAMES = [
  "子", "丑", "寅", "卯", "辰", "巳",
  "午", "未", "申", "酉", "戌", "亥",
] as const;
const TRANSFORMATION_TYPES = ["禄", "权", "科", "忌"] as const;

function getBirthInfo(request: FortuneRequest): {
  birthInfo: BirthInfo;
  hourBranch: number;
  chartDate: string;
  lateZishiAdjusted: boolean;
} {
  const validationErrors = validateFortuneRequest(request);
  if (validationErrors.length > 0) {
    throw new RangeError(validationErrors.join(" "));
  }
  if (request.gender === "unspecified") {
    throw new RangeError("Select male or female to calculate gender-dependent decade cycles.");
  }

  const hourBranch = clockTimeToBranchIndex(request.birthTime);
  const year = Number(request.birthDate.slice(0, 4));
  const month = Number(request.birthDate.slice(5, 7));
  const day = Number(request.birthDate.slice(8, 10));
  const clockHour = Number(request.birthTime.slice(0, 2));
  const clockMinute = Number(request.birthTime.slice(3, 5));
  const lateZishiAdjusted = clockHour === 23;
  const enteredDate = new Date(`${request.birthDate}T00:00:00.000Z`);
  if (lateZishiAdjusted) enteredDate.setUTCDate(enteredDate.getUTCDate() + 1);
  const chartYear = enteredDate.getUTCFullYear();
  const chartMonth = enteredDate.getUTCMonth() + 1;
  const chartDay = enteredDate.getUTCDate();
  if (chartYear > 9999) {
    throw new RangeError("A late Zi birth on the last day of year 9999 exceeds the supported chart date range.");
  }
  const chartDate = [
    String(chartYear).padStart(4, "0"),
    String(chartMonth).padStart(2, "0"),
    String(chartDay).padStart(2, "0"),
  ].join("-");

  const birthInfo: BirthInfo = {
    year: chartYear,
    month: chartMonth,
    day: chartDay,
    hour: hourBranch,
    gender: request.gender,
    city: request.city,
    origInput: {
      year,
      month,
      day,
      clockHour,
      clockMinute,
    },
  };

  return { birthInfo, hourBranch, chartDate, lateZishiAdjusted };
}

export function computeNatal(request: FortuneRequest): NatalCalculation {
  const { birthInfo, hourBranch, chartDate, lateZishiAdjusted } = getBirthInfo(request);
  const hourBranchName = BRANCH_NAMES[hourBranch];
  if (!hourBranchName) throw new RangeError("Birth time maps to an unsupported hour branch.");
  return {
    chart: generateChart(birthInfo, { leapMonth: "split" }),
    hourBranch,
    hourBranchName,
    enteredDate: request.birthDate,
    chartDate,
    lateZishiAdjusted,
    timeCorrection: "clock-time-only",
  };
}

export function computeYear(request: FortuneRequest, year: number): AnnualCalculation {
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new RangeError("Year must be a whole number from 1 to 9999.");
  }

  const { birthInfo } = getBirthInfo(request);
  const astrolabe = astro.bySolar(
    `${birthInfo.year}-${birthInfo.month}-${birthInfo.day}`,
    birthInfo.hour,
    birthInfo.gender === "male" ? "男" : "女",
    true,
    "zh-CN",
  );
  const { yearly } = astrolabe.horoscope(`${year}-06-01`, birthInfo.hour);

  return {
    year,
    palaceIndex: yearly.index,
    palaceNames: [...yearly.palaceNames],
    heavenlyStem: yearly.heavenlyStem,
    earthlyBranch: yearly.earthlyBranch,
    transformations: TRANSFORMATION_TYPES.flatMap((type, index) => {
      const star = yearly.mutagen[index];
      return star ? [{ type, star }] : [];
    }),
    annualStars: yearly.stars?.map((palaceStars) => palaceStars.map((star) => star.name)) ?? [],
    annualDeities: {
      jiangqian12: [...yearly.yearlyDecStar.jiangqian12],
      suiqian12: [...yearly.yearlyDecStar.suiqian12],
    },
  };
}
