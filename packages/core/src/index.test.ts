import { describe, expect, it } from "vitest";
import { clockTimeToBranchIndex, validateFortuneRequest } from "./index.js";

describe("clockTimeToBranchIndex", () => {
  it.each([
    ["23:00", 0],
    ["00:00", 0],
    ["01:59", 1],
    ["02:00", 1],
    ["11:30", 6],
    ["22:59", 11],
  ])("maps %s to branch index %i", (time, expected) => {
    expect(clockTimeToBranchIndex(time)).toBe(expected);
  });

  it.each(["24:00", "12:60", "9:30", "noon"])("rejects invalid time %s", (time) => {
    expect(() => clockTimeToBranchIndex(time)).toThrow(RangeError);
  });
});

describe("validateFortuneRequest", () => {
  const validRequest = {
    birthDate: "1990-04-12",
    birthTime: "08:30",
    gender: "unspecified",
    city: "Taipei",
    yearFrom: 2027,
    yearTo: 2027,
    detailLevel: "standard",
    schoolSetting: "quanshu",
  } as const;

  it("accepts a valid request", () => {
    expect(validateFortuneRequest(validRequest)).toEqual([]);
  });

  it("reports invalid dates and reversed year ranges", () => {
    expect(validateFortuneRequest({
      ...validRequest,
      birthDate: "1990-02-30",
      yearFrom: 2028,
      yearTo: 2027,
    })).toEqual([
      "Enter a valid birth date.",
      "The year range must be in ascending order.",
    ]);
  });
});
