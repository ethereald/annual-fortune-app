export type DetailLevel = "summary" | "standard" | "deep";

export type Gender = "female" | "male" | "unspecified";

export type SchoolSetting = "quanshu";

export interface FortuneRequest {
  birthDate: string;
  birthTime: string;
  gender: Gender;
  city: string;
  yearFrom: number;
  yearTo: number;
  detailLevel: DetailLevel;
  schoolSetting: SchoolSetting;
}

export interface SavedProfile extends FortuneRequest {
  id: string;
  name: string;
  createdAt: string;
}

export const HOUR_BRANCHES = [
  "子",
  "丑",
  "寅",
  "卯",
  "辰",
  "巳",
  "午",
  "未",
  "申",
  "酉",
  "戌",
  "亥",
] as const;

export function clockTimeToBranchIndex(time: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) {
    throw new RangeError("Time must be in 24-hour HH:MM format.");
  }

  const hour = Number(match[1]);
  return Math.floor(((hour + 1) % 24) / 2);
}

export function validateFortuneRequest(request: FortuneRequest): string[] {
  const errors: string[] = [];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(request.birthDate)) {
    errors.push("Enter a valid birth date.");
  } else {
    const parsed = new Date(`${request.birthDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== request.birthDate) {
      errors.push("Enter a valid birth date.");
    }
  }

  try {
    clockTimeToBranchIndex(request.birthTime);
  } catch {
    errors.push("Enter a birth time in 24-hour HH:MM format.");
  }

  if (!request.city.trim()) {
    errors.push("Enter a birth city or region.");
  }

  if (!Number.isInteger(request.yearFrom) || !Number.isInteger(request.yearTo)) {
    errors.push("Enter whole numbers for the year range.");
  } else if (request.yearFrom < 1 || request.yearTo > 9999 || request.yearTo < request.yearFrom) {
    errors.push("The year range must be in ascending order.");
  }

  return errors;
}
