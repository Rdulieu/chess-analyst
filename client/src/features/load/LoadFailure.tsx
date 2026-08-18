import type { ReactNode } from "react";

/**
 * What a screen shows when its load **failed**. Said in one place so every
 * screen that fetches on mount says it the same way, and none of them can
 * quietly fall back onto its empty state instead (`games-load-failure`).
 *
 * The cause is carried through: a server that is down must not read like a
 * server that is broken. The retry is part of the message — a failure the
 * Player cannot act on is only half told.
 */
export function LoadFailure({
  what,
  error,
  onRetry,
}: {
  what: ReactNode;
  error: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" data-state="failed">
      <p>
        Erreur : impossible de charger {what} ({error}).
      </p>
      <button type="button" onClick={onRetry}>
        Réessayer
      </button>
    </div>
  );
}
