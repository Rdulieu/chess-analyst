import type { Game, ImportParams, ImportResult } from "./types";

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

/**
 * Triggers an Import for one month through the local relay and returns its
 * result. On failure (e.g. an unknown chess.com username) throws with the
 * server's error message so the UI can show why.
 */
export async function importGames(params: ImportParams): Promise<ImportResult> {
  const res = await fetch("/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Import failed (${res.status})`);
  }
  return (await res.json()) as ImportResult;
}
