import type { ImportParams, ImportResult } from "../types";

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
