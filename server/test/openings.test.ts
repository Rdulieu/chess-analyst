import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { games, type NewGame } from "../src/db/schema";
import { getWeakOpenings } from "../src/openings/repository";
import { seedOpenings } from "../src/openings/fixture";
import { seedProfile } from "./fixtures";

function tempDb() {
  return openDb(":memory:").db;
}

/** The sole `Profile` every Game below is seeded under — every read names it. */
const PROFILE = 1;

let seq = 0;
function seed(db: ReturnType<typeof tempDb>, g: Partial<NewGame> & Pick<NewGame, "result">) {
  db.insert(games)
    .values({
      profileId: seedProfile(db),
      gameUrl: `https://chess.com/g/${seq++}`,
      pgn: "1. e4 e5",
      opponent: "opp",
      playerColor: "white",
      date: "2026-01-01",
      timeControlCategory: "blitz",
      eco: "B22",
      openingName: "Sicilian Defense Alapin Variation",
      ...g,
    })
    .run();
}

describe("getWeakOpenings", () => {
  it("returns one entry per (opening, side, cadence), with its tally and Win rate, sorted by games desc", () => {
    const db = tempDb();
    // Sicilian Alapin — White, blitz — 2 games (1 win, 1 loss) → 50%
    seed(db, { result: "win" });
    seed(db, { result: "loss" });
    // Italian Game — White, blitz — 1 game (win) → 100%
    seed(db, { eco: "C50", openingName: "Italian Game", result: "win" });
    // Same Sicilian ECO but Black, rapid — a separate entry, not merged with the White/blitz one
    seed(db, { playerColor: "black", timeControlCategory: "rapid", result: "draw" });

    const entries = getWeakOpenings(db, PROFILE);

    expect(entries).toHaveLength(3);
    // Most-played first: the White/blitz Sicilian (2 games) leads.
    expect(entries[0]).toMatchObject({
      eco: "B22",
      openingName: "Sicilian Defense Alapin Variation",
      side: "white",
      cadence: "blitz",
      games: 2,
      win: 1,
      draw: 0,
      loss: 1,
      winRate: 0.5,
    });
    // The other two (1 game each) follow.
    expect(entries.map((e) => e.games)).toEqual([2, 1, 1]);
    expect(entries).toContainEqual(
      expect.objectContaining({ eco: "C50", side: "white", cadence: "blitz", games: 1, winRate: 1 }),
    );
    expect(entries).toContainEqual(
      expect.objectContaining({ eco: "B22", side: "black", cadence: "rapid", games: 1, draw: 1, winRate: 0.5 }),
    );
  });

  it("aggregates Games chess.com did not classify under a single Other entry", () => {
    const db = tempDb();
    // Two unclassified Games, same side/cadence → one Other entry with 2 games.
    seed(db, { eco: "other", openingName: "Autre / non classée", result: "win" });
    seed(db, { eco: "other", openingName: "Autre / non classée", result: "loss" });

    const entries = getWeakOpenings(db, PROFILE);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ eco: "other", side: "white", cadence: "blitz", games: 2, winRate: 0.5 });
  });

  it("returns nothing for an empty history", () => {
    expect(getWeakOpenings(tempDb(), PROFILE)).toEqual([]);
  });

  it("produces the deterministic figures the Feature Path fixture is built for", () => {
    const db = tempDb();
    seedOpenings(db, seedProfile(db));

    const entries = getWeakOpenings(db, PROFILE);
    const by = (eco: string, side: string) => entries.find((e) => e.eco === eco && e.side === side)!;

    // Sorted by game count desc; the Sicilian (3 games) leads.
    expect(entries.map((e) => e.games)).toEqual([3, 2, 2, 1]);
    expect(by("B22", "white")).toMatchObject({ cadence: "blitz", games: 3, win: 1, loss: 2 });
    expect(by("B22", "white").winRate).toBeCloseTo(1 / 3);
    expect(by("C50", "white")).toMatchObject({ cadence: "rapid", games: 2, win: 2, winRate: 1 });
    expect(by("C00", "black")).toMatchObject({ cadence: "blitz", games: 2, win: 1, loss: 1, winRate: 0.5 });
    expect(by("other", "white")).toMatchObject({ cadence: "bullet", games: 1, loss: 1, winRate: 0 });
    // At least one weak (<50%), one strong, and the Other bucket present.
    expect(entries.filter((e) => e.winRate !== null && e.winRate < 0.5).length).toBeGreaterThanOrEqual(2);
  });
});
