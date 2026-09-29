import { describe, it, expect } from "vitest";
import {
  phaseDamageTable,
  phaseResultTable,
  type GameDamage,
  type PhaseEnding,
} from "../src/stats/phase-tables";

const ended = (phase: PhaseEnding["phase"], result: PhaseEnding["result"]): PhaseEnding => ({
  phase,
  result,
});

describe("phaseResultTable — where the Games end (US-32, table A)", () => {
  it("gives a row to each of the three Phases, in the Game's own order", () => {
    const table = phaseResultTable([ended("endgame", "win")]);
    expect(table.rows.map((r) => r.phase)).toEqual(["early", "middlegame", "endgame"]);
  });

  it("files a Game under the Phase it ENDED in, with its result", () => {
    const table = phaseResultTable([
      ended("endgame", "win"),
      ended("endgame", "loss"),
      ended("middlegame", "draw"),
    ]);
    const endgame = table.rows[2];
    expect(endgame).toMatchObject({ games: 2, win: 1, draw: 0, loss: 1, winRate: 0.5 });
    expect(table.rows[1]).toMatchObject({ games: 1, draw: 1, winRate: 0.5 });
    expect(table.rows[0]).toMatchObject({ games: 0, winRate: null });
  });

  it("makes the shares whole numbers that add up to a hundred", () => {
    // 6 / 36 / 144 of 186 is 3.2 / 19.4 / 77.4: rounded each on its own the
    // column prints 99, and the table claims 100. Largest remainder settles it
    // on the Endgame, whose fraction was closest to rounding up.
    const games = [
      ...Array.from({ length: 6 }, () => ended("early", "win")),
      ...Array.from({ length: 36 }, () => ended("middlegame", "win")),
      ...Array.from({ length: 144 }, () => ended("endgame", "win")),
    ];
    const table = phaseResultTable(games);
    expect(table.rows.map((r) => r.share)).toEqual([3, 19, 78]);
    expect(table.rows.reduce((sum, r) => sum + r.share, 0)).toBe(100);
  });

  it("counts an unreadable Game apart and keeps it out of every Phase", () => {
    const table = phaseResultTable([ended("endgame", "win"), ended(null, "loss")]);
    expect(table.unreadable).toBe(1);
    expect(table.games).toBe(2);
    expect(table.filed).toBe(1);
    expect(table.rows.reduce((sum, r) => sum + r.games, 0)).toBe(1);
    expect(table.rows.reduce((sum, r) => sum + r.share, 0)).toBe(100);
  });

  it("shares nothing rather than a hundred when there is nothing to file", () => {
    const table = phaseResultTable([ended(null, "loss")]);
    expect(table.rows.map((r) => r.share)).toEqual([0, 0, 0]);
  });
});

/** One analysed Game's damage, given as the shares it is read through. */
const damage = (early: number | null, middlegame: number | null, endgame: number | null): GameDamage => ({
  byPhase: { early, middlegame, endgame },
  chancesLost: [early, middlegame, endgame].reduce<number>((sum, x) => sum + (x ?? 0), 0),
});

describe("phaseDamageTable — where the damage falls (US-32, table B)", () => {
  it("counts the Games whose damage is heaviest in each Phase", () => {
    const table = phaseDamageTable([damage(1, 8, 1), damage(1, 2, 7), damage(6, 2, 2)], 20);
    expect(table.rows.map((r) => r.dominant)).toEqual([1, 1, 1]);
    expect(table.analysed).toBe(3);
    expect(table.games).toBe(20);
  });

  it("leaves a Game out of the denominator of a Phase it never reached", () => {
    // Two Games, one with no Endgame: the Endgame row is read over ONE Game.
    const table = phaseDamageTable([damage(2, 8, null), damage(0, 5, 5)], 2);
    expect(table.rows[2]).toMatchObject({ reached: 1, meanShare: 0.5, medianShare: 0.5 });
    expect(table.rows[1]).toMatchObject({ reached: 2, meanShare: 0.65 });
  });

  it("never gives the mean without the median", () => {
    // 10 / 10 / 80 % against 40 / 30 / 30 %: the mean says 55 %, the median 45 %.
    const table = phaseDamageTable([damage(1, 1, 8), damage(4, 3, 3)], 2);
    expect(table.rows[2].meanShare).toBeCloseTo(0.55, 10);
    expect(table.rows[2].medianShare).toBeCloseTo(0.55, 10);
    const three = phaseDamageTable([damage(1, 1, 8), damage(4, 3, 3), damage(5, 4, 1)], 3);
    expect(three.rows[2].meanShare).toBeCloseTo((0.8 + 0.3 + 0.1) / 3, 10);
    expect(three.rows[2].medianShare).toBeCloseTo(0.3, 10);
  });

  it("says nothing rather than zero for a Phase no analysed Game reached", () => {
    const table = phaseDamageTable([damage(2, 8, null)], 1);
    expect(table.rows[2]).toMatchObject({ reached: 0, meanShare: null, medianShare: null, dominant: 0 });
  });

  it("counts a Game that lost nothing apart, and gives it no dominant Phase", () => {
    const table = phaseDamageTable([damage(0, 0, 0), damage(1, 2, 7)], 2);
    expect(table.undamaged).toBe(1);
    expect(table.rows.map((r) => r.dominant)).toEqual([0, 0, 1]);
    // Its Phases are still reached — it crossed them, it simply crossed cleanly.
    expect(table.rows[2].reached).toBe(2);
  });

  it("breaks a tie on the Game's own order of Phases", () => {
    const table = phaseDamageTable([damage(5, 5, 0)], 1);
    expect(table.rows.map((r) => r.dominant)).toEqual([1, 0, 0]);
  });

  it("holds no table at all when nothing is analysed", () => {
    const table = phaseDamageTable([], 80);
    expect(table.analysed).toBe(0);
    expect(table.games).toBe(80);
    expect(table.rows.every((r) => r.meanShare === null)).toBe(true);
  });
});
