import type { MoveAnnotation } from "../types";

/** Why a Move does not count, as the server names it (CONTEXT.md). */
export type UncountedReason = "forced" | "decided";

/**
 * Each reason in **its own words**. Never melted into a bare "non compté": the
 * two say different things — one is a rule of chess, the other a limit of the
 * metric — and a Player who cannot tell them apart can audit neither.
 */
export const COUNTED_STATEMENT: Record<UncountedReason, string> = {
  forced: "Ne compte pas : ce coup était forcé, c'était le seul coup légal.",
  decided: "Ne compte pas : la position était déjà décidée avant ce coup.",
};

/** What the panel says of a Move that does count. */
export const COUNTED_YES = "Compté dans l'analyse.";

/**
 * The mark the move list puts on a flagged Move that does not count: its **own
 * reason**, not a bare "non compté".
 *
 * The two reasons are named apart *everywhere* — that is the slice's rule, and
 * the move list is not an exception to it. By construction the mark can only ever
 * be `forced` (an already-decided Position has less than the 10% left to lose
 * that flagging requires), so a generic wording would spend the scanning surface
 * to say strictly less than the truth. `decided` is defined all the same rather
 * than assumed unreachable: if it ever renders, it will say what it means.
 */
export const UNCOUNTED_MARK: Record<UncountedReason, { text: string; name: string }> = {
  forced: { text: "forcé", name: "coup forcé, non compté" },
  decided: { text: "déjà décidée", name: "position déjà décidée, non compté" },
};

/**
 * Whether the move list marks this Move as an uncounted one.
 *
 * **Only Moves that carry a severity AND do not count.** That pair is the
 * surprising case — the Game shows a fault and the analysis does not hold the
 * Player to it — and by construction it is only ever a **forced** Move, since
 * flagging needs a 10% drop and an already-decided Position has less than that
 * left to lose.
 *
 * Everything else stays unmarked, deliberately: in a Game lost at Move 25 every
 * later Move is excluded, and marking them would put eighteen marks carrying no
 * surprise at all on the surface the Player uses to **scan**. Those exclusions
 * are said in aggregate by the Game's summary instead.
 */
export function marksUncounted(annotation: MoveAnnotation): boolean {
  return annotation.severity !== null && annotation.counted?.counted === false;
}
