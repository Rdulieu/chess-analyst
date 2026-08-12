import { describe, it, expect } from "vitest";
import { monthsInRange, normalizeRange } from "../src/import/months";

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

describe("normalizeRange", () => {
  const now = { year: 2026, month: 8 };

  it("rejects a range whose first month is after its last", () => {
    expect(normalizeRange({ year: 2024, month: 6 }, { year: 2024, month: 3 }, now)).toBeNull();
  });

  it("clamps a last month in the future to the current month", () => {
    // A future month would answer zero games, and read as a hole in the history.
    expect(normalizeRange({ year: 2026, month: 1 }, { year: 2027, month: 4 }, now)).toEqual({
      from: { year: 2026, month: 1 },
      to: { year: 2026, month: 8 },
    });
  });

  it("leaves a range that is entirely in the past untouched", () => {
    const from = { year: 2024, month: 1 };
    const to = { year: 2024, month: 3 };
    expect(normalizeRange(from, to, now)).toEqual({ from, to });
  });

  it("accepts the current month as the last month", () => {
    expect(normalizeRange({ year: 2026, month: 8 }, { year: 2026, month: 8 }, now)).toEqual({
      from: { year: 2026, month: 8 },
      to: { year: 2026, month: 8 },
    });
  });
});
