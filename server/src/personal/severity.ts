import type { MoveSeverity } from "../danger/move-quality";

/**
 * The `Declared severity` (CONTEXT.md): the Player's own verdict on a Move, by
 * hand, inside their `Personal analysis` — on the **same scale as the measured
 * severities** plus the two values the engine has no band for.
 *
 * The shared vocabulary is deliberate: setting a declared verdict beside a
 * measured one is only meaningful on identical labels.
 *
 * - `sound` — "I looked, and I find nothing to fault". A value the Player
 *   **poses**, not an absence: without it, "I said nothing here" and "I say this
 *   Move is fine" would be the same silence, and a confrontation could only ever
 *   expose misses, never hits.
 * - `good` — "better than it looks".
 */
export type DeclaredSeverity = MoveSeverity | "sound" | "good";

/** The five values, worst to best. */
export const DECLARED_SEVERITIES: DeclaredSeverity[] = [
  "blunder",
  "mistake",
  "inaccuracy",
  "sound",
  "good",
];

/** Whether `value` is one of the five — the guard every write path goes through. */
export function isDeclaredSeverity(value: unknown): value is DeclaredSeverity {
  return DECLARED_SEVERITIES.includes(value as DeclaredSeverity);
}
