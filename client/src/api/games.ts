import { GameNotThisProfiles } from "./personal";
import type { Game, GameAnnotations } from "../types";

/**
 * The Games of **one `Profile`** (ADR-0014) — the Profile is named in the
 * request, so a list can never be one player's history with another's mixed in.
 * Each Game carries its full detail, including its PGN, so opening one needs no
 * separate request.
 */
export async function fetchGames(profileId: number): Promise<Game[]> {
  const res = await fetch(`/api/games?profileId=${profileId}`);
  if (!res.ok) throw new Error(`Failed to load games (${res.status})`);
  return (await res.json()) as Game[];
}

/**
 * Fetches a single Game's full detail by id (GET /api/games/:id), **as one
 * `Profile`** (ADR-0014). The Profile is named in the request like it is on the
 * list: a Game fetched by id alone used to come back to whoever asked, which
 * made the partition a property of the lists rather than of the data.
 *
 * `GameNotThisProfiles` when the Game is not that Profile's — the same refusal
 * the reading route already raises, so a caller tells "not yours" from "broken".
 */
export async function fetchGame(id: number, profileId: number): Promise<Game> {
  const res = await fetch(`/api/games/${id}?profileId=${profileId}`);
  if (res.status === 404) throw new GameNotThisProfiles(`Game ${id} is not profile ${profileId}'s`);
  if (!res.ok) throw new Error(`Failed to load game ${id} (${res.status})`);
  return (await res.json()) as Game;
}

/**
 * Fetches a Game's per-Move annotations (US-7): White-relative `Evaluation`
 * and severity for every half-move, already derived server-side
 * (GET /api/games/:id/annotations). `plies` is empty when `analyzed` is false.
 */
export async function fetchGameAnnotations(
  id: number,
  profileId: number,
): Promise<GameAnnotations> {
  const res = await fetch(`/api/games/${id}/annotations?profileId=${profileId}`);
  if (res.status === 404) throw new GameNotThisProfiles(`Game ${id} is not profile ${profileId}'s`);
  if (!res.ok) throw new Error(`Failed to load annotations for game ${id} (${res.status})`);
  return (await res.json()) as GameAnnotations;
}
