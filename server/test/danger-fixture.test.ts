import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { getDangerPositions } from "../src/danger/repository";
import { seedDangerFixture } from "../src/danger/fixture";

describe("Danger position fixture", () => {
  it("produces the three documented Positions — below 50%, at 100%, and the merged 0% transposition", () => {
    const { db } = openDb(":memory:");

    seedDangerFixture(db);
    const dangers = getDangerPositions(db);

    expect(dangers).toContainEqual(expect.objectContaining({ reached: 3, seriousErrors: 1, proportion: 1 / 3 }));
    expect(dangers).toContainEqual(expect.objectContaining({ reached: 2, seriousErrors: 2, proportion: 1 }));
    expect(dangers).toContainEqual(expect.objectContaining({ reached: 2, seriousErrors: 0, proportion: 0 }));
  });
});
