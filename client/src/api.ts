import type { Game } from "./types";

/** Lists every retained Game from the local API (one for now: the fixture). */
export async function fetchGames(): Promise<Game[]> {
  const res = await fetch("/api/games");
  if (!res.ok) throw new Error(`Failed to load games (${res.status})`);
  return (await res.json()) as Game[];
}

/** Fetches a single Game's full detail from the local API. */
export async function fetchGame(id: number): Promise<Game> {
  const res = await fetch(`/api/games/${id}`);
  if (!res.ok) throw new Error(`Failed to load game ${id} (${res.status})`);
  return (await res.json()) as Game;
}
