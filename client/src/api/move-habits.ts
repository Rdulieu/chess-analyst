import type { MoveHabitCandidate, Side } from "../types";

/**
 * One `Profile`'s candidate Moves from a Position (`fen`, 4-field) for a side,
 * most-played first (GET /api/move-habits). The explorer computes the resulting
 * FEN client-side as it drills down and calls this for each level.
 */
export async function fetchMoveHabits(
  profileId: number,
  fen: string,
  side: Side,
): Promise<MoveHabitCandidate[]> {
  const query = new URLSearchParams({ profileId: String(profileId), fen, side });
  const res = await fetch(`/api/move-habits?${query}`);
  if (!res.ok) throw new Error(`Failed to load move habits (${res.status})`);
  const body = (await res.json()) as { candidates: MoveHabitCandidate[] };
  return body.candidates;
}
