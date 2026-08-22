import type { Db } from "../db";
import type { TimeControlCategory } from "../platform";
import { games, type UnownedGame } from "../db/schema";
import { recordMoveHabits } from "./precompute";

/**
 * Deterministic `Move habit` fixture dataset (ADR-0005, PRD "Further Notes"):
 * a handful of short Games, played as both White and Black, sharing early Moves
 * so candidates aggregate — and including one **deliberate transposition** (b1
 * and b2 reach the same Position via different move orders *and* different
 * halfmove clocks before White plays Nc3), the key regression for the 4-field
 * FEN merge rule. This is the offline substrate the sub-issues' Feature Paths
 * run against; it never touches the network.
 */
export const MOVE_HABIT_FIXTURE: UnownedGame[] = [
  // White games — all open 1. e4 (→ aggregate to count 3, one win/loss/draw).
  fixtureGame("w1", "1. e4 e5 2. Nf3 Nc6 3. Bb5", "white", "win", "blitz"),
  fixtureGame("w2", "1. e4 e5 2. Nf3 Nc6 3. Bc4", "white", "loss", "blitz"),
  fixtureGame("w3", "1. e4 c5", "white", "draw", "bullet"),
  // Black games — b1 and b2 transpose into the same Position before 3. Nc3.
  fixtureGame("b1", "1. d4 Nf6 2. c4 e6 3. Nc3", "black", "loss", "rapid"),
  fixtureGame("b2", "1. c4 e6 2. d4 Nf6 3. Nc3", "black", "win", "blitz"),
  fixtureGame("b3", "1. d4 d5", "black", "loss", "blitz"),
];

function fixtureGame(
  ref: string,
  pgn: string,
  playerColor: "white" | "black",
  result: "win" | "loss" | "draw",
  timeControlCategory: TimeControlCategory,
): UnownedGame {
  return {
    gameUrl: `fixture://move-habits/${ref}`,
    pgn,
    opponent: `opponent-${ref}`,
    playerColor,
    result,
    date: "2026-01-01",
    timeControlCategory,
  };
}

/**
 * Seeds the `Move habit` fixture dataset and precomputes its counters through
 * the same standalone function the real import path uses (ADR-0005 — two entry
 * points, one logic). Idempotent: Games already present (unique game URL) are
 * skipped, so re-seeding never double-counts.
 */
export function seedMoveHabits(db: Db, profileId: number): void {
  for (const game of MOVE_HABIT_FIXTURE) {
    const inserted = db
      .insert(games)
      .values({ ...game, profileId })
      .onConflictDoNothing()
      .returning()
      .get();
    if (inserted) recordMoveHabits(db, inserted);
  }
}
