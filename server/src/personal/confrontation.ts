import type { MoveAnnotation } from "../analysis/derivation";
import type { SearchRegime } from "../engine/types";
import type { GameAnnotations } from "../annotations/repository";
import type { PersonalAnalysis } from "./repository";
import type { DeclaredSeverity } from "./severity";

/**
 * What one Game's `Confrontation` (CONTEXT.md) holds about the Player's
 * `Declared severity`s against the measured ones.
 *
 * **Numerators and denominators travel undivided.** The share is computed where
 * it is read, never stored, so the aggregate can be a **sum of numerators over a
 * sum of denominators** rather than an average of rates — which would give a
 * reading of three Moves the same weight as one of sixty.
 */
export interface SeverityReading {
  /**
   * The Player's `Counted Move`s — the denominator **both** figures share. Not
   * the Game's half-moves and not the Player's Moves: how justly the Player
   * judges is a conclusion about where they go wrong, and a `Counted Move` is
   * already the denominator of every such conclusion.
   */
  countedMoves: number;
  /**
   * Those of them the Player put a **verdict** on. A `Note` is not a verdict —
   * the Player said something, they judged nothing — and **silence stays
   * silence**: a Move with no `Declared severity` means *not examined*, which is
   * itself worth knowing.
   */
  examined: number;
  /**
   * Among the examined, those the engine has something to say about. **`Good` is
   * not one of them**: the engine flags flawed Moves only and has no band for
   * merit, so there is nothing to set it against. It is kept — the Player needs
   * it to read their Game — shown, and counted apart; it simply cannot be right
   * or wrong.
   *
   * Hence the two figures do not share this denominator: coverage asks *did I
   * look*, accuracy asks *was I right*, and a `Good` answers the first and not
   * the second.
   */
  scorable: number;
  /** Among the scorable, how many the engine agrees with. */
  agreed: number;
}

/**
 * How the reading was written: with the engine's findings **already shown** for
 * this Game, or not. A **provenance, not a lock** — the app cannot make anyone
 * blind, and claiming otherwise would sell a guarantee it cannot keep.
 */
export type Provenance = "unaided" | "informed";

/**
 * One Game's `Confrontation`, as every read path hands it over — and as the
 * aggregate folds it (ADR-0017). It carries **everything the aggregate
 * consumes**, so a Player can open one Game and see how a global figure was
 * arrived at.
 */
export interface GameConfrontation {
  gameId: number;
  /** When the reading was fixed. A Confrontation only exists past this instant. */
  sealedAt: string;
  /** Never optional: a comparison with no provenance is not a comparison. */
  provenance: Provenance;
  /** The `Search regime` behind the engine's figures — one per Game. */
  regime: SearchRegime | null;
  severity: SeverityReading;
}

/**
 * Why there is no `Confrontation` to give. **Two reasons, named apart** — they
 * are different facts with different next steps: one asks the Player to seal
 * their reading, the other to run the analysis. A single refusal for both would
 * leave them unable to tell which road to take, and a bare 404 would say the
 * Game is not there when it is.
 *
 * Modelled on `SealRefusal`: a refusal here is a **business fact**, not a
 * transport failure.
 */
export class ConfrontationRefusal {
  constructor(readonly reason: "not-sealed" | "not-analyzed") {}
}

/**
 * Sets a sealed `Personal analysis` against what the engine found on the same
 * Game — **a join**, not a second derivation (ADR-0019). Everything the engine
 * side contributes arrives in `annotations`, exactly as the API already serves
 * it, so there is no way for this to disagree with the Game's own page.
 */
export function confrontGame(
  analysis: PersonalAnalysis,
  annotations: GameAnnotations,
): GameConfrontation | ConfrontationRefusal {
  // The Player's own act is checked first: sending someone to go and analyse a
  // Game whose reading they have not finished points them down the wrong road.
  const { sealedAt } = analysis;
  if (sealedAt === null) return new ConfrontationRefusal("not-sealed");
  if (!annotations.analyzed || annotations.recap === null) {
    return new ConfrontationRefusal("not-analyzed");
  }

  const verdicts = sealedVerdicts(analysis);
  const reading: SeverityReading = {
    countedMoves: annotations.recap.countedMoves,
    examined: 0,
    scorable: 0,
    agreed: 0,
  };

  for (const move of annotations.plies) {
    // `counted` is `null` for ply 0 and for the **opponent's** Moves: nothing is
    // derived for them, so they are not "not counted" — they are not the
    // Player's play at all.
    if (!move.counted?.counted) continue;
    const declared = verdicts.get(move.ply);
    if (declared === undefined) continue;
    reading.examined += 1;
    if (!isScorable(declared)) continue;
    reading.scorable += 1;
    if (agrees(declared, move)) reading.agreed += 1;
  }

  return {
    gameId: analysis.gameId,
    sealedAt,
    // `false` and `null` both mean "nothing says the engine was shown". The
    // fallback is deliberately the honest one: guessing "informed" would
    // discredit the Player's own work, and guessing nothing is not an option
    // when the label is what makes the figure readable.
    provenance: analysis.engineSeenBeforeSeal ? "informed" : "unaided",
    regime: annotations.regime,
    severity: reading,
  };
}

/**
 * The verdicts that are **confronted**: the sealed layer only. What the Player
 * writes after the reveal is kept and shown, never compared — seeing the engine
 * and understanding why is the most fertile moment of the exercise, so
 * forbidding it would be absurd and counting it would be dishonest.
 */
function sealedVerdicts(analysis: PersonalAnalysis): Map<number, DeclaredSeverity> {
  const verdicts = new Map<number, DeclaredSeverity>();
  for (const mark of analysis.marks) {
    if (mark.posterior) continue;
    if (mark.declaredSeverity === null) continue;
    verdicts.set(mark.ply, mark.declaredSeverity);
  }
  return verdicts;
}

/** Whether the engine has any band to set this verdict against. */
function isScorable(declared: DeclaredSeverity): boolean {
  return declared !== "good";
}

/**
 * Whether a declared verdict and a measured one say the same thing. The two
 * scales share their vocabulary deliberately (CONTEXT.md), so on the three
 * measured bands this is an equality.
 *
 * The case worth naming is the fourth column: the engine flagged **nothing**.
 * That is a fact, not an absence, and `Sound` set against it is an **agreement**
 * — which is the entire reason `Sound` is a value the Player poses. Without it a
 * confrontation could only ever expose the Player's misses, never their hits.
 */
function agrees(declared: DeclaredSeverity, move: MoveAnnotation): boolean {
  return move.severity === null ? declared === "sound" : declared === move.severity;
}
