import { and, eq } from "drizzle-orm";
import type { Db } from "../db";
import { games, evaluations } from "../db/schema";
import { gamePlies, moveSeverities } from "../analysis/derivation";

export interface DangerEntry {
  fen: string;
  reached: number;
  seriousErrors: number;
  proportion: number;
}

/** How far ahead (in half-moves) a reach looks for a serious error (ADR-0009: tunable). */
const LOOKAHEAD_PLIES = 10;

/** A `Danger position` is a *recurring* Position (CONTEXT.md): reached at least twice.
 *  A Position seen once is a moment of a single Game — it belongs to that Game's review. */
const RECURRENCE_FLOOR = 2;

/** The 4-field FEN identity `Danger position` shares with `Move habit` (CONTEXT.md). */
function fourFieldFen(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

/**
 * `Danger position`s (CONTEXT.md), derived on the fly from analyzed Games'
 * stored per-ply `Evaluation`s (ADR-0009 — no engine call, no stored
 * aggregate). Every reached Position counts (the FEN's active-colour field
 * already separates whose turn it was — not scoped by side or cadence);
 * transpositions merge across every analyzed Game via the 4-field FEN.
 */
/**
 * How many Games have been through the `Analysis pass`. Served alongside the
 * aggregate so an empty list can be *read*: no analyzed Game at all, or
 * analyzed Games that simply never revisit the same Position — two different
 * things to tell the Player, indistinguishable from `dangers` alone.
 */
export function countAnalyzedGames(db: Db, profileId: number): number {
  return analyzedGamesOf(db, profileId).length;
}

/**
 * A `Danger position` is a Position **this** Player keeps reaching (CONTEXT.md),
 * so the derivation reads one `Profile`'s analyzed Games and no others: two
 * Profiles passing once each through the same Position is not a recurrence,
 * it is two players' single visits.
 */
function analyzedGamesOf(db: Db, profileId: number) {
  return db
    .select()
    .from(games)
    .where(and(eq(games.profileId, profileId), eq(games.analyzed, true)))
    .all();
}

export function getDangerPositions(db: Db, profileId: number): DangerEntry[] {
  const analyzedGames = analyzedGamesOf(db, profileId);

  const reached = new Map<string, number>();
  const seriousErrorReaches = new Map<string, number>();

  for (const game of analyzedGames) {
    const evals = db.select().from(evaluations).where(eq(evaluations.gameId, game.id)).all();
    const plies = gamePlies(evals);
    const severities = moveSeverities(plies, game.playerColor);

    // From ply 1: the initial Position is reached by every Game by construction,
    // so it is not somewhere the Player *arrives at*. Excluded by its ply index,
    // not by comparing FENs.
    for (let i = 1; i < plies.length; i++) {
      const key = fourFieldFen(plies[i].fen);
      reached.set(key, (reached.get(key) ?? 0) + 1);

      const windowEnd = Math.min(i + LOOKAHEAD_PLIES, severities.length);
      let serious = false;
      for (let j = i; j < windowEnd; j++) {
        if (severities[j] === "mistake" || severities[j] === "blunder") {
          serious = true;
          break;
        }
      }
      if (serious) seriousErrorReaches.set(key, (seriousErrorReaches.get(key) ?? 0) + 1);
    }
  }

  return [...reached.entries()]
    .filter(([, count]) => count >= RECURRENCE_FLOOR)
    .map(([fen, count]) => ({
      fen,
      reached: count,
      seriousErrors: seriousErrorReaches.get(fen) ?? 0,
      proportion: (seriousErrorReaches.get(fen) ?? 0) / count,
    }))
    // Most dangerous first — the page exists to surface those, not the most
    // travelled ones. Reach count only breaks ties.
    .sort((a, b) => b.proportion - a.proportion || b.reached - a.reached);
}
