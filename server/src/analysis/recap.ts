import type { Game } from "../db/schema";
import type { SearchRegime } from "../engine/types";
import { chancesLostByMove, countedMoves, type UncountedReason } from "./counted";
import { gamePlies, moveOpportunities, moveSeverities, type StoredEvaluation } from "./derivation";
import type { MoveSeverity } from "../danger/move-quality";
import { phases, type Phase } from "./phase";
import { signatureByPly } from "./crossed";

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
  /**
   * The gap between the two above — flagged Moves the analysis does not count —
   * **broken down by the reason that excluded them**, never as one figure.
   *
   * A lump would let the page say "shown but not counted" and stop there, which
   * is exactly the wording `UncountedReason` exists to forbid: *forced* is a rule
   * of chess and *already decided* is a limit of the metric, and a Player who
   * cannot tell them apart can audit neither. ADR-0017 already requires a Game to
   * carry **which** reason excluded a Move; this is that requirement met at the
   * recap's altitude rather than only at the Move's.
   *
   * Summing this record gives `flaggedMoves - countedErrors` exactly.
   */
  flaggedUncounted: Record<UncountedReason, number>;
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
  /**
   * What the **opponent** offered over this Game (CONTEXT.md `Opportunity`,
   * ADR-0034) — **beside** the Player's counts above and never summed into any
   * of them. Adding it to `countedErrors` is exactly the contamination ADR-0034
   * exists to prevent: "vos erreurs" must keep talking about the Player.
   *
   * It lives here rather than only in the `Confrontation` because an
   * `Opportunity` exists whether or not the Player ever read the Game, exactly
   * like `flaggedLoss` — 77 Games are analysed on the requester's base against 3
   * sealed readings, and the aggregate ADR-0017 describes folds the **per-Game**
   * record.
   */
  opportunities: OpportunityCount;
  /**
   * **Where** the Game was lost: the same figures again, located by `Phase`
   * (US-32). It is a **fold of this very recap**, not a second reading — the
   * three bands sum back to the totals above, which is the one claim the screen
   * invites the Player to check by hand.
   *
   * A `Phase` the Game **never reached** is `null`, never a band of zeroes: 19
   * of the 78 analysed Games have no Endgame, and "0 % of your damage in the
   * Endgame" on a Game that never had one is a **false strength**. Same
   * discipline as the `Key moment` that has no score and refuses to show a zero.
   */
  byPhase: PhaseBreakdown;
  /**
   * **In which configuration** the Game was lost (US-32): the chances lost in
   * each `Material signature` the Game crossed in its Endgame, in the order it
   * crossed them (CONTEXT.md, ADR-0036).
   *
   * It is the same fold as `byPhase`, one scale down, and deliberately in the
   * same producer: ADR-0017 makes the aggregate the sum of these recaps, so an
   * axis born anywhere else would be born twice.
   *
   * **`null` on a Game that never reached the Endgame**, never an empty list —
   * the axis is mute on 27 % of the corpus, and mute is said rather than printed
   * as an empty table. Same discipline as a `Phase` never reached.
   *
   * Only the **Endgame** half-moves are read, a scope decision of the grill and
   * not a property of the term. The currency is chances lost and nothing else:
   * the result-per-configuration reading lives on the corpus, and ADR-0036
   * forbids melting the two.
   */
  bySignature: SignatureDamage[] | null;
  /** The `Search regime` behind the figures — one per Game, never one per Move. */
  regime: SearchRegime | null;
}

/**
 * What one `Phase` of one Game holds — the Player's damage, split the way the
 * recap splits it, with the opponent's gifts **beside** it (ADR-0034).
 *
 * `flaggedLoss + drift === chancesLost` here exactly as it does on the Game, and
 * the three bands sum back to the Game's own figures. The split is the point:
 * "I hung a piece in the Endgame" and "I bled through the Endgame" are opposite
 * lessons, and one total would melt them.
 */
export interface PhaseDamage {
  /** Winning chances lost on the Player's `Counted Move`s played in this Phase. */
  chancesLost: number;
  /** The share of that the flagged Moves account for — what was **dropped**. */
  flaggedLoss: number;
  /** The residual — what was **bled**, that no flagged Move accounts for. */
  drift: number;
  /** Flawed Moves the analysis holds the Player to, in this Phase. */
  countedErrors: number;
  /** What the **opponent** offered here. Its own column, never summed into the
   *  Player's damage (ADR-0034). */
  opportunities: OpportunityCount;
}

/**
 * The three `Phase`s of a Game, each with its damage — or `null` where the Game
 * never got there. The `null` is load-bearing: it is what lets a screen say
 * *not reached* instead of printing a zero that reads as a strength.
 */
export type PhaseBreakdown = Record<Phase, PhaseDamage | null>;

/**
 * What one `Material signature` cost over one Game. A configuration is in the
 * list because the Game **crossed** it, so `chancesLost` at zero means *crossed
 * cleanly* — which is why the list is never filtered down to the ones that hurt.
 */
export interface SignatureDamage {
  /** The configuration, written the one way it is written (ADR-0036). */
  signature: string;
  /** Winning chances lost on the Player's `Counted Move`s landing in it. */
  chancesLost: number;
}

/** An empty band. Only ever created for a `Phase` the Game actually reached —
 *  which is what keeps "crossed cleanly" and "never reached" distinguishable. */
function noDamage(): PhaseDamage {
  return { chancesLost: 0, flaggedLoss: 0, drift: 0, countedErrors: 0, opportunities: noOpportunities() };
}

/**
 * The opponent's `Opportunity`s over one Game: how many, and of what size.
 *
 * The breakdown is not decoration — *three `Inaccuracy`-sized gifts* and *three
 * `Blunder`-sized ones* are different Games — and `bySeverity` sums to `total`
 * by construction, since the total is only ever incremented beside its bucket.
 */
export interface OpportunityCount {
  total: number;
  bySeverity: Record<MoveSeverity, number>;
}

/** A block with nothing in it yet — the one place the three buckets are named,
 *  so a fourth severity is one edit rather than a hunt through the callers. */
export function noOpportunities(): OpportunityCount {
  return { total: 0, bySeverity: { inaccuracy: 0, mistake: 0, blunder: 0 } };
}

/** One `Opportunity` added to a block, total and bucket together — which is why
 *  the breakdown sums to the total by construction rather than by care. */
export function countOpportunity(into: OpportunityCount, severity: MoveSeverity): void {
  into.total += 1;
  into.bySeverity[severity] += 1;
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
  // The SAME per-Move figure the annotations carry — summed here rather than
  // recomputed, so the trace drawn from those Moves and this total cannot
  // disagree (ADR-0017).
  const lostByMove = chancesLostByMove(plies, game.playerColor);
  // The SAME function the annotations read (ADR-0034): the recap totals what the
  // Moves carry and never asks the question a second time, so the block and the
  // glyphs on the Moves cannot say two different things.
  const opportunities = moveOpportunities(plies, game.playerColor);
  // Over the whole Game at once, exactly as the annotations read it: the Phase
  // latches, so it only exists as a sequence — and reading it here from the same
  // function is what stops the block and the Moves naming two different Phases.
  const phaseOf = phases(plies.map((ply) => ply.fen));
  // A band exists for a Phase the Game REACHED, and for no other. Built from the
  // Phases actually crossed rather than from the three names, which is the whole
  // difference between a zero and an absence.
  const byPhase: PhaseBreakdown = { early: null, middlegame: null, endgame: null };
  for (const phase of phaseOf) byPhase[phase] ??= noDamage();
  // The same pre-pass, one scale down: a bucket per configuration the Endgame
  // ACTUALLY crossed, in crossing order, and none for a configuration the Game
  // never saw. A `Map` because the order of first appearance is the reading
  // order the screen wants, and the string is the key by construction — a
  // signature has one writing and one only.
  const bySignature = new Map<string, SignatureDamage>();
  // Read once per Endgame ply and kept, exactly as `phaseOf` is: the Player's
  // loop below needs the same reading, and asking twice is how two readings of
  // one Position start to differ.
  const signatureOf = signatureByPly(
    plies.map((ply) => ply.fen),
    game.playerColor,
  );
  for (const key of signatureOf) {
    if (key !== null && !bySignature.has(key)) bySignature.set(key, { signature: key, chancesLost: 0 });
  }

  const recap: GameRecap = {
    playerMoves: 0,
    countedMoves: 0,
    excluded: { forced: 0, decided: 0 },
    flaggedMoves: 0,
    countedErrors: 0,
    flaggedUncounted: { forced: 0, decided: 0 },
    chancesLost: 0,
    flaggedLoss: 0,
    drift: 0,
    opportunities: noOpportunities(),
    byPhase,
    // Mute on a Game with no Endgame, and mute is `null`: an empty list would
    // let a screen print a table of nothing where it owes the Player a sentence.
    bySignature: byPhase.endgame === null ? null : [...bySignature.values()],
    regime,
  };

  // Its own pass over the plies, deliberately: the Player's loop below is about
  // the Player's Moves and skips everything else, and threading a second subject
  // through it is how one subject ends up in the other's figures.
  for (const [ply, offered] of opportunities.entries()) {
    if (offered === null) continue;
    countOpportunity(recap.opportunities, offered.severity);
    countOpportunity(byPhase[phaseOf[ply]]!.opportunities, offered.severity);
  }

  for (let i = 1; i < plies.length; i++) {
    const move = counted[i];
    if (move === null) continue; // the opponent's: nothing is derived for it
    const severity = severities[i - 1];

    recap.playerMoves += 1;
    if (severity) recap.flaggedMoves += 1;

    if (!move.counted) {
      if (move.reason) {
        recap.excluded[move.reason] += 1;
        // Shown by the Game and held against nobody: the surprising pair, and the
        // only one the page has to explain rather than merely total.
        if (severity) recap.flaggedUncounted[move.reason] += 1;
      }
      continue;
    }

    // The Phase of the Position this Move LED TO — the very one the annotation
    // of ply `i` carries, so the block and the Move list locate a Move alike.
    const band = byPhase[phaseOf[i]]!;

    recap.countedMoves += 1;
    if (severity) {
      recap.countedErrors += 1;
      band.countedErrors += 1;
    }

    const lost = lostByMove[i] ?? 0;
    if (lost <= 0) continue;
    recap.chancesLost += lost;
    band.chancesLost += lost;
    // Read on Endgame half-moves only (ADR-0036), and the SCOPE is what says so —
    // never the mere existence of a bucket. The two are not the same: `phases()`
    // latches, so a promotion puts material back and an Endgame Position can
    // carry the very signature a pre-Endgame Position carried. Keying on the
    // string alone poured a Middlegame loss into an Endgame bucket and broke the
    // fold identity in silence, which is the one thing this axis must not do.
    if (signatureOf[i] !== null) bySignature.get(signatureOf[i]!)!.chancesLost += lost;
    if (severity) {
      recap.flaggedLoss += lost;
      band.flaggedLoss += lost;
    }
  }

  // The residual, computed as one — never accumulated separately, which is
  // exactly how the two parts would drift apart from the total.
  recap.drift = recap.chancesLost - recap.flaggedLoss;
  // The same residual, per band and by the same subtraction — so the identity
  // holds in every Phase for the same reason it holds on the Game.
  for (const band of Object.values(byPhase)) {
    if (band) band.drift = band.chancesLost - band.flaggedLoss;
  }
  return recap;
}
