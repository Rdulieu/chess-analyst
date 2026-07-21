import type { Game } from "../types";

/**
 * Lists every retained Game from the local API. The list carries each Game's
 * full detail, including its PGN, so opening one needs no separate request.
 */
export async function fetchGames(): Promise<Game[]> {
  const res = await fetch("/api/games");
  if (!res.ok) throw new Error(`Failed to load games (${res.status})`);
  return (await res.json()) as Game[];
}

/** Fetches a single Game's full detail by id (GET /api/games/:id). */
export async function fetchGame(id: number): Promise<Game> {
  const res = await fetch(`/api/games/${id}`);
  if (!res.ok) throw new Error(`Failed to load game ${id} (${res.status})`);
  return (await res.json()) as Game;
}
