import { describe, it, expect } from "vitest";
import { monthsInRange } from "../src/import/months";

describe("monthsInRange", () => {
  it("covers a single month when both bounds are the same month", () => {
    expect(monthsInRange({ year: 2024, month: 3 }, { year: 2024, month: 3 })).toEqual([
      { year: 2024, month: 3 },
    ]);
  });

  it("covers every month in order, rolling over the year boundary", () => {
    expect(monthsInRange({ year: 2023, month: 11 }, { year: 2024, month: 2 })).toEqual([
      { year: 2023, month: 11 },
      { year: 2023, month: 12 },
      { year: 2024, month: 1 },
      { year: 2024, month: 2 },
    ]);
  });
});
