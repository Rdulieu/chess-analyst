import type { Game } from "../db/schema";
import type { SearchRegime } from "../engine/types";
import { countedMoves, type UncountedReason } from "./counted";
import { gamePlies, moveSeverities, type StoredEvaluation } from "./derivation";

/**
 * What one Game **contributes** to the analysis — the reconciliation point
 * ADR-0017 is about. The aggregate of US-15c is **this recap summed**, so
 * reconciliation is the *definition* and not a test we hope goes green: there is
 * one implementation of the method, and the page and the corpus read the same
 * one. Two implementations of a method agree only by luck, and diverge in
 * silence.
 *
 * Everything here is about the Player's **`Counted Move`s**. An excluded Move
 * contributes neither an error nor a lost chance: it says nothing about the
 * Player's play, which is the whole reason it was excluded.
 */
export interface GameRecap {
  /** Every Move the Player played, counted or not — the honest denominator's total. */
  playerMoves: number;
  /** How many of them the analysis counts. */
  countedMoves: number;
  /** The excluded ones, **by reason**: the two are never melted into one figure. */
  excluded: Record<UncountedReason, number>;
  /**
   * Flawed Moves the **Game** shows, counted or not. Kept beside `countedErrors`
   * because the two can legitimately differ — a flagged Move that was forced is
   * in this figure and not in that one — and two correct summaries disagreeing
   * side by side read as a bug unless the gap is stated.
   */
  flaggedMoves: number;
  /** Flawed Moves the **analysis** holds the Player to. */
  countedErrors: number;
  /** Winning chances the Player lost across their counted Moves, in points. */
  chancesLost: number;
  /** The share of that the flagged counted Moves account for. */
  flaggedLoss: number;
  /**
   * The `Drift` (CONTEXT.md): everything lost that **no flagged Move accounts
   * for** — a residual, by construction, never an object with a start and an end.
   * `flaggedLoss + drift === chancesLost` on every Game, which is what lets Games
   * be summed without counting the same lost chances twice.
   *
   * It is also what a threshold reading is structurally blind to: bleeding 5% a
   * Move for fifteen Moves never trips the `Inaccuracy` floor and loses the Game
   * as surely as one `Blunder`.
   */
  drift: number;
  /** The `Search regime` behind the figures — one per Game, never one per Move. */
  regime: SearchRegime | null;
}

/**
 * The recap of one Game, from the same stored rows every other read path uses.
 * No engine call and nothing persisted (ADR-0009): retuning a threshold retunes
 * this, with no re-analysis and no migration.
 */
export function gameRecap(
  game: Pick<Game, "playerColor">,
  evals: StoredEvaluation[],
  regime: SearchRegime | null,
): GameRecap {
  const plies = gamePlies(evals);
  const severities = moveSeverities(plies, game.playerColor);
  const counted = countedMoves(plies, game.playerColor);

  const recap: GameRecap = {
    playerMoves: 0,
    countedMoves: 0,
    excluded: { forced: 0, decided: 0 },
    flaggedMoves: 0,
    countedErrors: 0,
    chancesLost: 0,
    flaggedLoss: 0,
    drift: 0,
    regime,
  };

  for (let i = 1; i < plies.length; i++) {
    const move = counted[i];
    if (move === null) continue; // the opponent's: nothing is derived for it
    const severity = severities[i - 1];

    recap.playerMoves += 1;
    if (severity) recap.flaggedMoves += 1;

    if (!move.counted) {
      if (move.reason) recap.excluded[move.reason] += 1;
      continue;
    }

    recap.countedMoves += 1;
    if (severity) recap.countedErrors += 1;

    // The Position's chances are relative to whoever is to move there: the Player
    // before their own Move, the opponent after it — hence the flip.
    const lost = plies[i - 1].winChances - (100 - plies[i].winChances);
    // Only losses. A Move that gained is not a negative loss to net off against
    // another Move's: the figure is "what this Game cost the Player".
    if (lost <= 0) continue;
    recap.chancesLost += lost;
    if (severity) recap.flaggedLoss += lost;
  }

  // The residual, computed as one — never accumulated separately, which is
  // exactly how the two parts would drift apart from the total.
  recap.drift = recap.chancesLost - recap.flaggedLoss;
  return recap;
}
