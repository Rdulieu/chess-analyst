import { startImport, fetchImportStatus } from "../../api";
import type { ImportParams, ImportStatus } from "../../types";

/** How often to poll the Import status while it runs (ms). */
const POLL_MS = 500;

/**
 * Runs an Import over a month range to completion, reporting progress via
 * `onProgress` after the start and after every subsequent poll — the single
 * implementation of the Import's start+poll loop (US-9, ADR-0010), twin of
 * `runAnalysis`. The final status — carrying the range's consolidated summary —
 * is returned, so the caller does not have to capture it from `onProgress`.
 */
export async function runImport(
  params: ImportParams,
  onProgress: (status: ImportStatus) => void,
): Promise<ImportStatus> {
  let status = await startImport(params);
  onProgress(status);
  while (status.running) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    status = await fetchImportStatus();
    onProgress(status);
  }
  return status;
}
