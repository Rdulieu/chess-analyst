import { eq } from "drizzle-orm";
import { crossedSignatures } from "../analysis/crossed";
import { gamePositions } from "../chess/positions";
import type { Db } from "../db";
import { games, type Game } from "../db/schema";
import { TIME_CONTROL_CATEGORIES, type TimeControlCategory } from "../platform";
import { bucket, type Bucket } from "../results/win-rate";
import { signatureTable, type SignatureTable } from "./signatures";

/** History-wide results summary (see PRD / CONTEXT.md `Win rate`). */
export interface StatsSummary {
  total: Bucket;
  byCategory: Record<TimeControlCategory, Bucket>;
  bySide: Record<"white" | "black", Bucket>;
  /**
   * The corpus table of `Material signature`s (ADR-0036) — the **second** scale,
   * in its own currency. Deliberately not folded into the three buckets above:
   * a Game sits on as many rows as it crossed configurations, so these rows do
   * not add up to `total` and never should.
   */
  signatures: SignatureTable;
}

/**
 * Which Endgame configurations one Game crossed, **remembered for the life of
 * the process**.
 *
 * The derivation itself is free (ADR-0009); its *input* is not. Only 78 of the
 * base's 2 438 Games are analysed, so the FENs `evaluations` stores (ADR-0012)
 * cover almost none of this table and the rest must be replayed from the PGN —
 * measured at **25 ms per Game**, i.e. 46 s over the largest `Profile` of the
 * base. That is the very cost ADR-0012 removed from `/danger` by storing the
 * FEN, and no column may be added here (US-32: no schema change, no migration).
 *
 * So the replay is paid **once per Game per process** instead of once per view.
 * Keying on the Game's id is sound because a PGN is immutable: import dedups by
 * URL and ADR-0030 refuses a refresh that changes the movetext. The map hangs
 * off the `Db` so two databases — every test opens its own `:memory:` one —
 * never see each other's Games.
 *
 * What it does **not** fix is the first view, which still pays the whole replay.
 * Removing that needs the Positions of an unanalysed Game to be stored, which is
 * a schema change and a migration: a ticket of its own, named rather than
 * smuggled in here.
 */
const crossedByGame = new WeakMap<Db, Map<number, string[]>>();

function crossedOf(db: Db, game: Game): string[] {
  let remembered = crossedByGame.get(db);
  if (!remembered) crossedByGame.set(db, (remembered = new Map()));

  const known = remembered.get(game.id);
  if (known) return known;

  // A PGN that cannot be replayed costs this Game its row, not the whole table
  // — the same refusal `import/range.ts` makes, one Game not failing the batch.
  const crossed = replayed(game);
  remembered.set(game.id, crossed);
  return crossed;
}

function replayed(game: Game): string[] {
  try {
    return crossedSignatures(gamePositions(game.pgn), game.playerColor);
  } catch {
    return [];
  }
}

/**
 * Aggregates **one `Profile`'s** Games on the fly into that player's summary
 * (ADR-0014). The `Win rate` this returns is one player's win rate; averaging
 * two histories into it would produce a figure that is nobody's.
 */
export function getStats(db: Db, profileId: number): StatsSummary {
  const rows = db.select().from(games).where(eq(games.profileId, profileId)).all();
  return {
    total: bucket(rows),
    byCategory: Object.fromEntries(
      TIME_CONTROL_CATEGORIES.map((c) => [c, bucket(rows.filter((r) => r.timeControlCategory === c))]),
    ) as Record<TimeControlCategory, Bucket>,
    bySide: {
      white: bucket(rows.filter((r) => r.playerColor === "white")),
      black: bucket(rows.filter((r) => r.playerColor === "black")),
    },
    signatures: signatureTable(
      rows.map((row) => ({ result: row.result, signatures: crossedOf(db, row) })),
    ),
  };
}
