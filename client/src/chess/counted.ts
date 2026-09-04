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
 * The two reasons are named apart *everywhere* — that is the rule, and the move
 * list is not an exception to it.
 *
 * `decided` was written here while it was unreachable: flagging asked for a 10%
 * drop and an already-decided Position had less than that left to lose, so the
 * mark could only ever be `forced`. It was defined all the same, "rather than
 * assumed unreachable: if it ever renders, it will say what it means". **US-37
 * is when it started rendering** — the band is 5 and the floor is still 10 — and
 * the decision to write it then rather than assume it away is the reason this
 * screen needed no change at all.
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
 * Player to it — and since US-37 it is reachable by **either** reason: a forced
 * Move that is also a catastrophe, or a Move played between the band (5) and the
 * floor (10), which can drop enough to be flagged in a Position the denominator
 * has already given up on.
 *
 * Everything else stays unmarked, deliberately: in a Game lost at Move 25 every
 * later Move is excluded, and marking them would put eighteen marks carrying no
 * surprise at all on the surface the Player uses to **scan**. Those exclusions
 * are said in aggregate by the Game's summary instead.
 */
export function marksUncounted(annotation: MoveAnnotation): boolean {
  return annotation.severity !== null && annotation.counted?.counted === false;
}
