import { Chess } from "cm-chess";
import type { Game } from "../db/schema";
import type { Ply, StoredEvaluation } from "../analysis/derivation";

/**
 * One stored `Evaluation` as the **review** reads it: everything the app's own
 * derivation needs, plus the **second line's score** — a column that is written
 * on every row (the MultiPV 2 US-15a paid 2.1x for) and that no read path had
 * ever opened.
 */
export interface StoredLine extends StoredEvaluation {
  cp2: number | null;
  mate2: number | null;
}

/**
 * The **mechanical facts** about one of the Player's Moves, from which the review
 * of US-15a-bis must find out which one — if any — separates the Moves an outside
 * reference flags and we miss, from the rest (ADR-0023).
 *
 * Every one of them is read off a **column already stored**, so none costs a
 * second of engine time and any of them can be retuned and replayed on the rows
 * in the database (ADR-0024). And every one is a fact the Player can check on
 * their own board — never our adjective, the same discipline by which the
 * glossary refuses "tactical error" and shows the line instead.
 *
 * They are computed on **every** Player Move, flagged or not: a signal that is
 * true of the six Moves we miss but also of a hundred correct ones separates
 * nothing, and without the whole denominator that cannot be seen.
 */
export interface MoveSignals {
  /**
   * Material the Player is **down** by the end of the exchange, in pawns —
   * measured from the Position their Move was played from to the Position after
   * the **opponent's reply**.
   *
   * The reply is in the span deliberately: `13...Kc7` costs 0.36 pawn of
   * evaluation and is a Blunder only because `14.Nxh8` then takes the rook
   * (ADR-0023). Counted on the Player's own Move alone, that Move loses nothing
   * at all — and `3.Nxe5 Nxe5` would read as *winning* a pawn.
   */
  material: number;
  /**
   * The distance to mate before the Move and after it, **Player-relative**: a
   * positive figure is a mate the Player gives, a negative one a mate they
   * receive, `null` no mate at all. "The mate went from 7 to 1" is ADR-0023's own
   * example of a signal a Player can verify on the board.
   *
   * Spanned over the Player's **own** Move, unlike `material`: an evaluation is a
   * search and already foresees the reply, where material is a board fact that
   * only changes hands once the reply is played.
   */
  mate: { before: number | null; after: number | null };
  /**
   * The **raw centipawn** drop over the Player's own Move, Player-relative;
   * `null` where either Position was a mate score and there is no centipawn
   * figure to state — a fact, not a gap.
   *
   * Kept beside the winning chances rather than instead of them: chances
   * **saturate** at the extremes, which is precisely why the end of a lost Game
   * is invisible to the severity bands, and it is the calibration this review has
   * to be able to look at.
   */
  cpDrop: number | null;
  /**
   * Where there was nothing to choose: whether the **Move** was the only legal
   * one — the very rule the `forced` exclusion reads — and whether the
   * **reply** was, which is what a recapture sequence looks like from here.
   *
   * A rule of chess read off a Position already stored, so it costs no engine
   * call. The glossary says a `forced` Move *may* still be flagged (a single
   * legal Move that is a catastrophic recapture); "never seen" was a fact about
   * a seven-Game sample, and this is how the review finds out.
   */
  forced: { move: boolean; reply: boolean };
  /**
   * The acuity of the Position the Move was played from: how much the engine's
   * best line was worth **over its second** (`gap`, in centipawns), and whether
   * there was no second line at all (`only` — a Position with a single legal
   * Move, which the schema records as both second-line columns being null).
   *
   * `gap: null` with `only: false` is a third case and says so: the two lines
   * are not comparable in centipawns, one of them being a mate.
   *
   * This is the score US-15a paid **2.1x** of engine time for and of which only
   * the `Best line` was ever read.
   */
  secondLine: { gap: number | null; only: boolean };
}

/** What each piece is worth, in pawns. The king has no material value. */
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * The signals of the Move that led to `plies[i]`, played by `playerColor`.
 * `plies` is the Game's own sequence, so the reply — where a Move's real cost
 * often lands — is simply the next entry, and the last Move of a Game has none.
 */
export function moveSignals(
  plies: Ply[],
  i: number,
  playerColor: Game["playerColor"],
  /**
   * The stored row of the Position the Move was played **from** — the only place
   * the second line's score lives, and a column `Ply` does not carry.
   */
  from: Pick<StoredLine, "cp" | "cp2" | "mate2">,
): MoveSignals {
  const before = plies[i - 1];
  // The Position after the opponent's reply when there is one; otherwise the
  // Position the Move itself led to — a Game that ends on the Player's Move.
  const after = plies[i + 1] ?? plies[i];

  return {
    material: balance(before.fen, playerColor) - balance(after.fen, playerColor),
    mate: {
      before: playerRelative(before.evaluation.mate, true),
      // The Player moved, so the opponent is to move at `plies[i]`: what is
      // stored there is the opponent's own reading of the mate.
      after: playerRelative(plies[i].evaluation.mate, false),
    },
    forced: { move: onlyMove(before.fen), reply: onlyMove(plies[i].fen) },
    cpDrop: drop(
      playerRelative(before.evaluation.cp, true),
      playerRelative(plies[i].evaluation.cp, false),
    ),
    // Both scores are read at the same Position, where the Player is the side to
    // move, so neither needs flipping.
    secondLine: {
      gap: from.cp === null || from.cp2 === null ? null : from.cp - from.cp2,
      only: from.cp2 === null && from.mate2 === null,
    },
  };
}

/** Whether the side to move in that Position has exactly one legal Move. */
function onlyMove(fen: string): boolean {
  return new Chess({ fen }).moves().length === 1;
}

/** What the Player lost between two Player-relative scores, when both exist. */
function drop(before: number | null, after: number | null): number | null {
  if (before === null || after === null) return null;
  return before - after;
}

/**
 * A stored, side-to-move-relative figure read as the Player's own. `theirTurn`
 * says whether the Player is the side to move at that Position; when they are
 * not, the sign flips — the same conversion the annotations apply to the
 * winning chances (`100 -`).
 */
function playerRelative(stored: number | null, theirTurn: boolean): number | null {
  if (stored === null) return null;
  return theirTurn ? stored : -stored;
}

/** The Player's material advantage in that Position, in pawns. */
function balance(fen: string, playerColor: Game["playerColor"]): number {
  const placement = fen.split(" ")[0];
  let mine = 0;
  let theirs = 0;
  for (const symbol of placement) {
    const value = VALUE[symbol.toLowerCase()];
    if (value === undefined) continue;
    const white = symbol === symbol.toUpperCase();
    if (white === (playerColor === "white")) mine += value;
    else theirs += value;
  }
  return mine - theirs;
}

/**
 * Where each signal is set to fire. Not a setting of the app — **nothing in the
 * app reads these** — but the review's dial: they are compared against columns
 * already stored, so moving one and re-running costs no engine time and no
 * migration (ADR-0024). Their defaults are a starting point for the measurement,
 * not a published threshold: the predicate and its bar are the requester's
 * arbitration (ADR-0023), and this module must not look like it has decided.
 */
export interface SignalThresholds {
  /** Pawns the Player must be down over the Move and its reply. */
  material: number;
  /** Half-moves closer a mate against the Player must have come. */
  mateCloser: number;
  /** Centipawns the Player must have dropped over their own Move. */
  cpDrop: number;
  /** Centipawns the best line must have been worth over the second. */
  secondLineGap: number;
}

/** The starting point of the measurement, and nothing more than that. */
export const DEFAULT_THRESHOLDS: SignalThresholds = {
  material: 1,
  mateCloser: 1,
  cpDrop: 100,
  secondLineGap: 150,
};

/** Which of the five signals fire on a Move at a given setting. */
export interface SignalVerdict {
  material: boolean;
  mate: boolean;
  cpDrop: boolean;
  forced: boolean;
  secondLine: boolean;
}

/**
 * Which signals designate this Move at this setting. Read on **every** Player
 * Move: a signal true of the six Moves we miss and of a hundred correct ones
 * separates nothing, and this is what makes that visible.
 */
export function designates(signals: MoveSignals, thresholds: SignalThresholds): SignalVerdict {
  return {
    material: signals.material >= thresholds.material,
    mate: mateCameCloser(signals.mate) >= thresholds.mateCloser,
    cpDrop: signals.cpDrop !== null && signals.cpDrop >= thresholds.cpDrop,
    // No threshold to set: "there was one legal Move" is a fact of chess.
    forced: signals.forced.move || signals.forced.reply,
    secondLine: signals.secondLine.gap !== null && signals.secondLine.gap >= thresholds.secondLineGap,
  };
}

/**
 * By how many half-moves a mate **against the Player** came closer over their
 * Move — ADR-0023's own example, "the mate went from 7 to 1", being 6.
 *
 * A mate that **appeared** counts as having come closer by its whole distance:
 * there is no larger jump than a mate arriving. A mate the Player *gives*, and a
 * mate that receded, count as nothing: neither says a Move went wrong.
 */
function mateCameCloser({ before, after }: MoveSignals["mate"]): number {
  const distance = (mate: number | null) => (mate !== null && mate < 0 ? -mate : null);
  const now = distance(after);
  if (now === null) return 0;
  const was = distance(before);
  return was === null ? now : was - now;
}
