import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { games } from "../db/schema";
import { loadGame } from "../chess/positions";

/**
 * One Game as the Lichess export re-answers it: the same Moves, now carrying
 * the `[%clk]` comments nobody ever asked for, plus the two facts that are
 * stored rather than derived.
 */
export interface RefreshedGame {
  gameUrl: string;
  pgn: string;
  /** The one Clock reading belonging to no `Move`; `null` on a mate. */
  lastClockCs: number | null;
  /** The `Lichess division` (ADR-0031) — an oracle, never our `Phase`. */
  divisionMiddlePly: number | null;
  divisionEndPly: number | null;
}

/** What a refresh did, for the CLI to show its work. */
export interface RefreshOutcome {
  /**
   * **Rows** written, not Games. A Game played between two tracked accounts is
   * two rows (ADR-0014) and both are refreshed, so this can exceed the number of
   * Games the export answered with — which is the honest figure, since it is
   * rows that were stale.
   */
  changed: number;
  /** Rows already carrying their clocks AND their three columns — a second run
   *  finds only these. */
  alreadyDone: number;
  /** Games the export answered for that this database never imported at all. */
  notImported: number;
}

/**
 * Raised when an incoming Game's **movetext differs from the stored one**.
 *
 * This is not a defensive nicety around the real work: **it is the reason the
 * refresh is allowed to touch a Game carrying irreplaceable engine output at
 * all** (ADR-0030). Identical moves yield identical FENs, so the `Evaluation`s
 * of the 10 analysed Lichess Games survive a PGN replacement — and this
 * comparison is what turns that claim into a checked one. Nothing but engine
 * time rebuilds an `Evaluation`.
 */
export class MovetextChanged extends Error {
  constructor(readonly gameUrl: string) {
    super(
      `Le mouvement de ${gameUrl} ne correspond plus à celui qui est stocké : ` +
        `remplacer son PGN invaliderait les FEN de ses Evaluation. Rien n'a été écrit.`,
    );
    this.name = "MovetextChanged";
  }
}

/**
 * Refreshes already-imported Lichess Games with the clocks their export was
 * never asked for (US-15b, slice 05) — **a one-off correction of 434 rows**,
 * 10 of them analysed.
 *
 * ## What it does, and the three things it deliberately does not
 *
 * - It **replaces `games.pgn` in place**, keeping the row's id. It never deletes
 *   and re-inserts: that would break the foreign key `evaluations` holds on
 *   `game_id` and re-count the Game's `Move habit`s, **both silently**
 *   (ADR-0030). It is also why this is not folded into the ordinary import,
 *   whose `insert()` skips a Game already present and has no update path.
 * - It **compares the movetext first and throws on a difference**, rather than
 *   skipping the Game or overwriting it. See `MovetextChanged`.
 * - It **does not touch `moveHabitsComputed`**, so the pre-aggregated counters
 *   (ADR-0005) are identical before and after.
 *
 * ## Why the comparison ignores comments
 *
 * The comments are **exactly what is being added**, so comparing raw PGN strings
 * would refuse every Game — a safeguard that is present and useless, which is
 * worse than none. What is compared is the sequence of Moves, read through the
 * same parser both sides go through.
 *
 * ## One transaction
 *
 * Checked and written together. A partially applied refresh, on rows nobody can
 * list afterwards, is worse than none at all — so one mismatched Game anywhere
 * in the batch leaves the whole database untouched.
 *
 * Re-runnable by construction: a Game that already carries its clocks is
 * reported and not written, so a second run finds nothing to do and says so.
 */
export function refreshClocks(db: Db, incoming: RefreshedGame[]): RefreshOutcome {
  return db.transaction((tx) => {
    const outcome: RefreshOutcome = { changed: 0, alreadyDone: 0, notImported: 0 };

    for (const game of incoming) {
      // **Every** row of this Game, not the first one. Uniqueness is
      // `(profile_id, game_url)`, not the URL alone (ADR-0014): a Game played
      // between two tracked accounts is **two rows**, each recorded from its own
      // Player's point of view — by design, not a dedup fault.
      //
      // Selecting one with `.get()` refreshed a single row and left the other
      // carrying its clock-less PGN; the second account's pass then re-selected
      // the row already done and reported the pair `alreadyDone`. On the
      // reference corpus that silently stranded **21 Games** — one of them
      // analysed — in a state no re-run could repair, with the two Profiles
      // disagreeing about the same Game for ever. Found by the Feature Path, on
      // the real corpus; invisible to every single-Profile test.
      const stored = tx.select().from(games).where(eq(games.gameUrl, game.gameUrl)).all();
      if (stored.length === 0) {
        // Not an error: the export answers for the whole account and may name a
        // Game this database never kept (a variant, a game from a position).
        outcome.notImported += 1;
        continue;
      }

      for (const row of stored) {
        // **The assertion, before any write.** Throwing here aborts the
        // transaction, so nothing lands — for this row, this Game, or any other.
        if (movesOf(row.pgn) !== movesOf(game.pgn)) throw new MovetextChanged(game.gameUrl);

        // The PGN may already be what we would write — but the three stored
        // columns are NOT in the PGN (ADR-0029's single exception), so "the
        // movetext is current" does not mean "the row is".
        const current =
          row.pgn === game.pgn &&
          row.lastClockCs === game.lastClockCs &&
          row.divisionMiddlePly === game.divisionMiddlePly &&
          row.divisionEndPly === game.divisionEndPly;
        if (current) {
          outcome.alreadyDone += 1;
          continue;
        }

        tx.update(games)
          .set({
            pgn: game.pgn,
            lastClockCs: game.lastClockCs,
            divisionMiddlePly: game.divisionMiddlePly,
            divisionEndPly: game.divisionEndPly,
          })
          .where(eq(games.id, row.id))
          .run();
        outcome.changed += 1;
      }
    }

    return outcome;
  });
}

/**
 * A Game's Moves, in standard notation, as one comparable string — the PGN read
 * through the parser rather than compared as text, so that comments, whitespace
 * and header differences cannot make two identical games look different.
 */
function movesOf(pgn: string): string {
  return loadGame(pgn)
    .history()
    .map((move) => move.san)
    .join(" ");
}
