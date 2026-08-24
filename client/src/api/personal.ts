import type { DeclaredSeverity, PersonalAnalysis } from "../types";

/**
 * The named refusal: this Game is not the named `Profile`'s, so there is no
 * reading of it to answer (ADR-0014). Distinguished from any other failure
 * because the screen has something true and specific to say about it — "not this
 * Profile's Game" is not "the app is broken".
 */
export class GameNotThisProfiles extends Error {}

/**
 * The Player's own reading of one Game (`Personal analysis`, CONTEXT.md), scoped
 * to the `Profile` like every other read (ADR-0014). A Game nobody has read yet
 * answers an **empty reading**, not a 404 — no reading is the normal starting
 * state, and a caller that had to tell absent from empty would branch on it
 * forever.
 */
export async function fetchPersonalAnalysis(
  gameId: number,
  profileId: number,
): Promise<PersonalAnalysis> {
  const res = await fetch(`/api/personal/${gameId}?profileId=${profileId}`);
  if (res.status === 404) throw new GameNotThisProfiles(`Game ${gameId} is not profile ${profileId}'s`);
  if (!res.ok) throw new Error(`Failed to load reading for game ${gameId} (${res.status})`);
  return (await res.json()) as PersonalAnalysis;
}

/**
 * Records what the Player says about one ply and answers the whole reading back
 * — so the screen never has to guess what it just produced, nor re-read to find
 * out. Writing is what starts a reading: there is no separate act of declaring one.
 */
export async function savePersonalMark(
  gameId: number,
  profileId: number,
  ply: number,
  patch: { declaredSeverity?: DeclaredSeverity | null },
): Promise<PersonalAnalysis> {
  const res = await fetch(`/api/personal/${gameId}/marks/${ply}?profileId=${profileId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Failed to save mark on ply ${ply} (${res.status})`);
  return (await res.json()) as PersonalAnalysis;
}
