import type { Phase } from "../../chess/phase";
import type { PhaseDamageTable, PhaseResultTable } from "../../types";

/**
 * The `Phase` the **damage** table designates: the one dominant in the most
 * analysed Games.
 *
 * `null` on a tie, and that is not timidity — the screen uses this to say *the
 * two readings disagree*, and a designation shared by two Phases designates
 * nothing. `null` too when nothing is analysed.
 */
export function heaviestDamage(table: PhaseDamageTable): Phase | null {
  return sole(table.rows.filter((row) => row.dominant > 0).map((row) => ({ key: row.phase, by: row.dominant })));
}

/**
 * The `Phase` the **results** table designates: the one the Player wins least
 * in. Same `null` on a tie, for the same reason.
 *
 * Rows with no Game are skipped rather than read as a win rate of zero: a Phase
 * the Player never ended a Game in is not a Phase they are bad at.
 */
export function weakestResult(table: PhaseResultTable): Phase | null {
  const scored = table.rows.filter((row) => row.games > 0 && row.winRate !== null);
  return sole(scored.map((row) => ({ key: row.phase, by: -(row.winRate as number) })));
}

/** The single highest `by`, or `null` when two share it — or nothing has one. */
function sole(entries: { key: Phase; by: number }[]): Phase | null {
  if (entries.length === 0) return null;
  const best = Math.max(...entries.map((e) => e.by));
  const winners = entries.filter((e) => e.by === best);
  return winners.length === 1 ? winners[0].key : null;
}

/**
 * Whether the two tables **point at different `Phase`s** — the one thing the
 * screen says about them jointly, and it says it as an observation.
 *
 * ADR-0036's amendment forbids a composite, a shared column and a common
 * ranking: the two readings are kept apart precisely because they disagree, and
 * the disagreement is the information rather than a defect to smooth over. So
 * this returns the two Phases and nothing derived from both — no score, no
 * verdict, no cause. On the requester's base the damage names the Middlegame and
 * the results name the Endgame, and neither table says why.
 *
 * `null` when they agree, or when either table has nothing to designate.
 */
export function phaseDisagreement(
  results: PhaseResultTable,
  damage: PhaseDamageTable,
): { damage: Phase; result: Phase } | null {
  const byDamage = heaviestDamage(damage);
  const byResult = weakestResult(results);
  if (byDamage === null || byResult === null || byDamage === byResult) return null;
  return { damage: byDamage, result: byResult };
}
