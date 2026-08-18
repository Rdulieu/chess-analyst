import { useCallback, useEffect, useState } from "react";

/**
 * What a screen that fetches on mount knows about its data. Three states, never
 * two: **loading**, **failed** and **loaded** are different things to tell the
 * Player, and only the last of them can be empty.
 *
 * Collapsing them is the bug this exists against (`games-load-failure`): a
 * failed request rendered as an empty result, so the screen announced "aucune
 * partie" while the history sat untouched in the database and invited the
 * Player to import what they already had. An invitation is right for exactly
 * one state; a failure must say the load failed and offer to try again.
 */
export type Loaded<T> =
  | { state: "loading" }
  | { state: "failed"; error: string }
  | { state: "loaded"; data: T };

/**
 * Runs `load` on mount and whenever `deps` change, in the three states above,
 * plus the `retry` a failure owes the Player. A late answer to a superseded
 * request is dropped rather than shown — switching Profile must not leave the
 * previous one's figures on screen.
 */
export function useLoaded<T>(
  load: () => Promise<T>,
  deps: readonly unknown[],
): Loaded<T> & { retry: () => void; reload: () => void } {
  const [result, setResult] = useState<Loaded<T>>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const again = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    setResult({ state: "loading" });
    load()
      .then((data) => live && setResult({ state: "loaded", data }))
      .catch((cause: Error) => live && setResult({ state: "failed", error: cause.message }));
    return () => {
      live = false;
    };
    // `load` is rebuilt on every render by its caller; the deps the caller
    // declares are what the load actually depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  return { ...result, retry: again, reload: again };
}
