import { describe, it, expect } from "vitest";
import { and, eq } from "drizzle-orm";
import { openDb } from "../src/db";
import { games, moveHabits, type NewGame } from "../src/db/schema";
import { recordMoveHabits } from "../src/move-habits/precompute";
import { seedMoveHabits } from "../src/move-habits/fixture";
import { listCandidates } from "../src/move-habits/repository";

/** The 4-field FEN of the standard starting position (no move counters). */
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -";

function tempDb() {
  return openDb(":memory:").db;
}

let urlSeq = 0;
/** Inserts a Game and returns the stored row (with its generated id + flag). */
function seedGame(db: ReturnType<typeof tempDb>, game: Partial<NewGame> & Pick<NewGame, "pgn">) {
  return db
    .insert(games)
    .values({
      gameUrl: `https://chess.com/g/${urlSeq++}`,
      opponent: "opp",
      playerColor: "white",
      result: "win",
      date: "2026-01-01",
      timeControlCategory: "blitz",
      ...game,
    })
    .returning()
    .get();
}

function habit(db: ReturnType<typeof tempDb>, fen: string, side: "white" | "black", san: string) {
  return db
    .select()
    .from(moveHabits)
    .where(and(eq(moveHabits.fen, fen), eq(moveHabits.side, side), eq(moveHabits.san, san)))
    .get();
}

describe("recordMoveHabits", () => {
  it("records the first Move played from the starting Position", () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5 2. Nf3", result: "win", timeControlCategory: "blitz" });

    recordMoveHabits(db, game);

    const e4 = habit(db, START, "white", "e4");
    expect(e4).toBeTruthy();
    expect(e4!.count).toBe(1);
    expect(e4!.win).toBe(1);
    expect(e4!.blitz).toBe(1);
  });

  it("records every half-move of the Game — the opponent's replies too", () => {
    const db = tempDb();
    recordMoveHabits(db, seedGame(db, { pgn: "1. e4 e5 2. Nf3" }));

    // Three plies → three entries: the player's e4/Nf3 and the opponent's e5.
    const all = db.select().from(moveHabits).all();
    expect(all).toHaveLength(3);
    expect(all.map((h) => h.san).sort()).toEqual(["Nf3", "e4", "e5"]);
    expect(all.every((h) => h.count === 1 && h.side === "white")).toBe(true);
  });

  it("aggregates counters across Games that share a Move", () => {
    const db = tempDb();
    recordMoveHabits(db, seedGame(db, { pgn: "1. e4 e5", result: "win", timeControlCategory: "blitz" }));
    recordMoveHabits(db, seedGame(db, { pgn: "1. e4 c5", result: "loss", timeControlCategory: "bullet" }));
    recordMoveHabits(db, seedGame(db, { pgn: "1. e4 e6", result: "draw", timeControlCategory: "blitz" }));

    const e4 = habit(db, START, "white", "e4")!;
    expect(e4.count).toBe(3);
    expect([e4.win, e4.draw, e4.loss]).toEqual([1, 1, 1]);
    expect(e4.blitz).toBe(2);
    expect(e4.bullet).toBe(1);
  });

  it("merges Games that transpose into the same Position, even at different depths (4-field FEN key)", () => {
    const db = tempDb();
    // Both reach the same Position before playing e4 — but at different move
    // numbers (the second detours via a knight round-trip), so their full FENs
    // differ in the move counters while their 4-field keys match.
    recordMoveHabits(db, seedGame(db, { pgn: "1. Nf3 Nf6 2. Nc3 Nc6 3. e4", result: "win" }));
    recordMoveHabits(
      db,
      seedGame(db, { pgn: "1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Nc3 Nc6 5. e4", result: "loss" }),
    );

    // e4 is played only from the merged Position in both Games: one entry, not two.
    const e4rows = db.select().from(moveHabits).where(eq(moveHabits.san, "e4")).all();
    expect(e4rows).toHaveLength(1);
    expect(e4rows[0].count).toBe(2);
    expect([e4rows[0].win, e4rows[0].loss]).toEqual([1, 1]);
  });

  it("counts a Game exactly once even when precomputation runs twice on it", () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5" });

    recordMoveHabits(db, game);
    recordMoveHabits(db, game); // second run must be a no-op (flag already set)

    expect(habit(db, START, "white", "e4")!.count).toBe(1);
  });

  it("stops recording past the 40-half-move (20 full move) depth cap", () => {
    const db = tempDb();
    // A quiet knight shuffle 22 full moves (44 half-moves) long — well past the cap.
    const pgn = Array.from({ length: 22 }, (_, m) =>
      m % 2 === 0 ? `${m + 1}. Nf3 Nf6` : `${m + 1}. Ng1 Ng8`,
    ).join(" ");
    recordMoveHabits(db, seedGame(db, { pgn }));

    // Every recorded half-move increments exactly one counter, so the grand
    // total of all counters is the number of half-moves actually walked: 40.
    const total = db
      .select()
      .from(moveHabits)
      .all()
      .reduce((sum, h) => sum + h.count, 0);
    expect(total).toBe(40);
  });
});

describe("seedMoveHabits (fixture dataset)", () => {
  it("seeds a deterministic dataset: shared first Moves aggregate on the White side", () => {
    const db = tempDb();
    seedMoveHabits(db);

    const e4 = listCandidates(db, START, "white").find((c) => c.san === "e4")!;
    expect(e4.count).toBe(3); // three White games open 1. e4
    expect(e4.winRate).toBe(0.5); // one win, one loss, one draw
  });

  it("includes a deliberate transposition that merges into a single entry", () => {
    const db = tempDb();
    seedMoveHabits(db);

    // Two Black games reach the same Position via different move orders (and
    // different halfmove clocks) before White plays Nc3 → one merged entry.
    const nc3 = db
      .select()
      .from(moveHabits)
      .where(and(eq(moveHabits.side, "black"), eq(moveHabits.san, "Nc3")))
      .all();
    expect(nc3).toHaveLength(1);
    expect(nc3[0].count).toBe(2);
  });

  it("is idempotent — seeding twice does not double-count", () => {
    const db = tempDb();
    seedMoveHabits(db);
    seedMoveHabits(db);

    const e4 = listCandidates(db, START, "white").find((c) => c.san === "e4")!;
    expect(e4.count).toBe(3);
  });
});
