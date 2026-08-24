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
  patch: { declaredSeverity?: DeclaredSeverity | null; note?: string | null; keyMoment?: boolean },
): Promise<PersonalAnalysis> {
  const res = await fetch(`/api/personal/${gameId}/marks/${ply}?profileId=${profileId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Failed to save mark on ply ${ply} (${res.status})`);
  return (await res.json()) as PersonalAnalysis;
}

/**
 * **Seals** the reading (US-16a): fixes what will be confronted, dates it, and
 * records whether the engine had already been shown for this Game. The provenance
 * is sent explicitly and has no default — the server refuses a seal that does not
 * state it, because quietly recording "not seen" would launder an informed reading
 * into a blind one.
 *
 * A refusal is a **business fact**, not a transport failure: it comes back as
 * `SealRefused` carrying the reason and the sentence to show.
 */
export async function sealPersonalAnalysis(
  gameId: number,
  profileId: number,
  engineSeen: boolean,
): Promise<PersonalAnalysis> {
  const res = await fetch(`/api/personal/${gameId}/seal?profileId=${profileId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ engineSeen }),
  });
  if (res.status === 409) {
    const body = (await res.json()) as { reason: string; error: string };
    throw new SealRefused(body.error, body.reason);
  }
  if (!res.ok) throw new Error(`Failed to seal reading for game ${gameId} (${res.status})`);
  return (await res.json()) as PersonalAnalysis;
}

/**
 * Why the server would not seal — a reading with nothing in it, or one already
 * sealed. Both are things the Player must be **told**, so the message travels
 * with the refusal rather than being re-invented on screen.
 */
export class SealRefused extends Error {
  constructor(
    message: string,
    readonly reason: string,
  ) {
    super(message);
  }
}
