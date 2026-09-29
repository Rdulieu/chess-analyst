import { phases, type Phase } from "./phase";
import { signature } from "./signature";

/**
 * The **set** of `Material signature`s a Game crossed in its Endgame, in the
 * order it met them (ADR-0036).
 *
 * It is a *set*, and that is the whole point of this module: the corpus table of
 * `/stats` counts a Game **once per configuration crossed**, so what it needs is
 * which configurations were met, never how long each was held nor what it cost.
 * A configuration held for twenty plies is one crossing.
 *
 * Kept apart from `signature()`, which knows nothing of a `Phase` and must go on
 * knowing nothing: reading the configuration on Endgame plies only is a scope
 * decision of US-32, not a property of the term. And kept apart from
 * `gameRecap`, whose `bySignature` is the *other* scale of ADR-0036 — chances
 * lost, within one Game. The two are never folded into each other: summing
 * per-Game damage would not give a corpus result, and a corpus result is not an
 * average of per-Game recaps.
 *
 * Takes FENs rather than a PGN so it stays a pure derivation: the caller decides
 * where the Positions come from — stored `Evaluation`s for an analysed Game, a
 * PGN replay for the 2 360 Games of the base that were never analysed.
 *
 * `phaseOf` is an **optimisation with a default**, not a second way of asking:
 * a caller that already holds the Game's Phases — `/stats` needs the last one
 * for its own table (US-32) — hands them in rather than paying `phases()` a
 * second time over the same FENs. Passing anything but this Game's own Phases
 * would be a lie, and there is no reason to.
 */
export function crossedSignatures(
  fens: string[],
  playerColor: "white" | "black",
  phaseOf: Phase[] = phases(fens),
): string[] {
  return [...new Set(signatureByPly(fens, playerColor, phaseOf).filter((key) => key !== null))];
}

/**
 * The `Material signature` of every ply, **`null` outside the Endgame** — the
 * one place the scope rule of ADR-0036 ("read on Endgame plies only") is
 * written, so widening it later is one edit rather than a hunt.
 *
 * Both readings of that rule go through here: the *set* the corpus table folds,
 * and the per-ply array `gameRecap` charges chances lost against. That the two
 * share a derivation is not a merging of the two currencies — they part company
 * immediately after, and the currencies are what ADR-0036 keeps apart, not the
 * reading of the board.
 *
 * `null` rather than an omission, because the array is **index-aligned with the
 * FENs**: a caller walks it beside the plies and asks each one whether it
 * counts.
 */
export function signatureByPly(
  fens: string[],
  playerColor: "white" | "black",
  phaseOf: Phase[] = phases(fens),
): (string | null)[] {
  return fens.map((fen, ply) => (phaseOf[ply] === "endgame" ? signature(fen, playerColor) : null));
}
