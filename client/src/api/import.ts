import type { ImportParams, ImportStatus } from "../types";

/**
 * Starts an Import over the given month range through the local relay and
 * returns its initial status. A range Import runs in the background (ADR-0010),
 * so this resolves as soon as it has *started*, not when it is done — poll
 * `fetchImportStatus` for progress. On failure (e.g. an unknown chess.com
 * username) throws with the server's message so the UI can show why.
 */
export async function startImport(params: ImportParams): Promise<ImportStatus> {
  const res = await fetch("/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Import failed (${res.status})`);
  }
  return (await res.json()) as ImportStatus;
}

/** The running Import's progress, counted in months. */
export async function fetchImportStatus(): Promise<ImportStatus> {
  const res = await fetch("/api/import/status");
  return (await res.json()) as ImportStatus;
}
