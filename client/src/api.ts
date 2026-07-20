import type { Game } from "./types";

/**
 * Lists every retained Game from the local API (one for now: the fixture).
 * The list carries each Game's full detail, including its PGN, so the initial
 * board render needs no separate per-game request.
 */
export async function fetchGames(): Promise<Game[]> {
  const res = await fetch("/api/games");
  if (!res.ok) throw new Error(`Failed to load games (${res.status})`);
  return (await res.json()) as Game[];
}

/**
 * Fetches a single Game's full detail by id (GET /api/games/:id). Not used by
 * the initial board render, but it's the seam later features build on — e.g.
 * opening one specific Game to explore its Moves.
 */
export async function fetchGame(id: number): Promise<Game> {
  const res = await fetch(`/api/games/${id}`);
  if (!res.ok) throw new Error(`Failed to load game ${id} (${res.status})`);
  return (await res.json()) as Game;
}
