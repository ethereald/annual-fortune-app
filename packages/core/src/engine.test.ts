import { describe, expect, it } from "vitest";
import { computeNatal, computeYear } from "./engine.js";
import type { FortuneRequest } from "./types.js";

const request: FortuneRequest = {
  birthDate: "1990-04-12",
  birthTime: "08:30",
  gender: "male",
  city: "Taipei",
  yearFrom: 2027,
  yearTo: 2027,
  detailLevel: "standard",
  schoolSetting: "quanshu",
};

describe("computeNatal", () => {
  it("matches the pinned engine golden chart", () => {
    const result = computeNatal(request);
    const lifePalace = result.chart.palaces.find((palace) => palace.isMingGong);

    expect(result.chart.palaces).toHaveLength(12);
    expect(result.chart.mingGongBranch).toBe(0);
    expect(result.chart.lunarInfo.fourPillars).toEqual(["庚午", "庚辰", "丁未", "甲辰"]);
    expect(lifePalace?.stars).toContainEqual(expect.objectContaining({
      name: "太阳",
      type: "major",
      siHua: "禄",
      brightnessRaw: "陷",
    }));
    expect(result).toMatchObject({
      hourBranch: 4,
      hourBranchName: "辰",
      enteredDate: "1990-04-12",
      chartDate: "1990-04-12",
      lateZishiAdjusted: false,
      timeCorrection: "clock-time-only",
    });
  });

  it("moves late Zi births to the next charting day", () => {
    const result = computeNatal({ ...request, birthTime: "23:15" });

    expect(result.hourBranch).toBe(0);
    expect(result.hourBranchName).toBe("子");
    expect(result.chartDate).toBe("1990-04-13");
    expect(result.lateZishiAdjusted).toBe(true);
  });

  it("requires a gender to calculate gender-dependent decade cycles", () => {
    expect(() => computeNatal({ ...request, gender: "unspecified" })).toThrow(
      "Select male or female",
    );
  });
});

describe("computeYear", () => {
  it("returns the annual palace, transformations, and annual deities", () => {
    expect(computeYear(request, 2027)).toMatchObject({
      year: 2027,
      palaceIndex: 7,
      heavenlyStem: "丁",
      earthlyBranch: "未",
      transformations: [
        { type: "禄", star: "太阴" },
        { type: "权", star: "天同" },
        { type: "科", star: "天机" },
        { type: "忌", star: "巨门" },
      ],
      annualDeities: {
        jiangqian12: expect.any(Array),
        suiqian12: expect.any(Array),
      },
    });
  });

  it("indexes annual palaces by earthly branch starting from 子", () => {
    const result = computeYear({ ...request, birthDate: "1980-01-25", birthTime: "00:40", gender: "male" }, 2026);

    expect(result.earthlyBranch).toBe("午");
    expect(result.palaceIndex).toBe(6);
    expect(result.palaceNames[6]).toBe("命宫");
    expect(result.palaceNames[5]).toBe("兄弟");
    expect(result.palaceNames[0]).toBe("迁移");
  });

  it("rejects an invalid year", () => {
    expect(() => computeYear(request, 0)).toThrow(RangeError);
  });
});
