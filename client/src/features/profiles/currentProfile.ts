/**
 * The **current `Profile`** — which one the app is about — held CLIENT-SIDE and
 * persisted locally, so it survives a reload while the server stays stateless
 * (PRD, *API*): there is no "current profile" on the server, and a response is
 * always the answer to a question that named its Profile.
 *
 * Only the **id** is stored: the Profile's own fields (its username, its
 * counters) come from the API, so a stale copy in local storage could never
 * disagree with what the list shows.
 */
const KEY = "chess-analyst.current-profile";

/** The id of the current Profile, or null when none was ever chosen. */
export function loadCurrentProfileId(): number | null {
  const stored = localStorage.getItem(KEY);
  if (stored === null) return null;
  const id = Number(stored);
  return Number.isInteger(id) ? id : null;
}

/** Makes this Profile the current one, for this reload and the next. */
export function saveCurrentProfileId(id: number): void {
  localStorage.setItem(KEY, String(id));
  announce();
}

/** Leaves nothing selected — what deleting the current Profile must do. */
export function clearCurrentProfileId(): void {
  localStorage.removeItem(KEY);
  announce();
}

/**
 * The selection is **observable**, not merely stored. Switching Profile happens
 * on `/profiles` and its effect must be visible on the analysis screens the
 * Player walks to next — with no reload, since the app never does one. Without
 * this, the banner would keep naming the previous Profile while the figures
 * below it changed: exactly the silent confusion the banner exists against.
 */
const listeners = new Set<() => void>();

function announce(): void {
  for (const listener of listeners) listener();
}

/** Subscribes to changes of the current Profile; returns the unsubscribe. */
export function subscribeCurrentProfileId(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
