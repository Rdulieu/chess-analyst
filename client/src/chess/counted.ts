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
