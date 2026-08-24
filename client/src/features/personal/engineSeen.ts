import type { ReviewMode } from "../review/reviewMode";

/**
 * The **provenance** of a `Personal analysis` (CONTEXT.md): had the engine's
 * findings **already been shown for this Game** before the reading was sealed?
 * Written on the model of `reviewMode.ts` — one rule, a couple of functions,
 * decidable with no rendering — because it is the kind of rule that must have
 * exactly one home.
 *
 * Held **client-side**, like the `Review mode` and the current `Profile`, because
 * only the client knows what was actually put on screen. At sealing it is handed
 * to the server, which stores it: that is the **one** fact in this app where what
 * was *displayed* becomes persistent, and the exception is deliberate — a
 * comparison with no provenance is not a comparison.
 *
 * **It is a label, not a lock.** A cleared local store answers "not seen"; the
 * Player can open another tab; nothing here prevents anyone from looking. So the
 * app **labels** a reading — read unaided, or read informed — and never claims to
 * have kept anyone blind. That is exactly the promise the glossary refused when it
 * rejected the name *Blind mode*, and it is why every fallback below is "not
 * seen" rather than a guess.
 */
const KEY = "chess-analyst.engine-seen";

/** The Games the engine has been shown for, as far as this browser knows. */
function seenGames(): number[] {
  const stored = localStorage.getItem(KEY);
  if (stored === null) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    // A store of the wrong shape is a store this app did not write. It is not
    // repaired and not trusted: it answers "not seen", like an absent one.
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === "number") : [];
  } catch {
    return [];
  }
}

/**
 * Whether the engine's findings had been shown for this Game. Read at the moment
 * of sealing, and nowhere else — this is a statement about the past, not a
 * setting.
 */
export function engineWasSeen(gameId: number): boolean {
  return seenGames().includes(gameId);
}

/**
 * Records that the engine's findings **were actually rendered** for this Game.
 * Called from the screen that rendered them, not from the one that intended to:
 * an intention is not a thing the Player saw.
 */
export function noteEngineShown(gameId: number): void {
  const seen = seenGames();
  if (seen.includes(gameId)) return;
  localStorage.setItem(KEY, JSON.stringify([...seen, gameId]));
}

/**
 * Whether a given screen state **is** showing the engine. Both halves are needed
 * and neither is enough:
 *
 * - a level above **Unaided** is a willingness to be shown, and
 * - an **analysed** Game is something to show.
 *
 * A `Détaillé` level on an unanalysed Game displays nothing of the engine, so
 * marking it seen would label an honestly blind reading as informed — the flag
 * would then be worse than useless, because it would be wrong in the direction
 * that discredits the Player's own work.
 */
export function showsEngine({
  analyzed,
  mode,
}: {
  analyzed: boolean;
  mode: ReviewMode;
}): boolean {
  return analyzed && mode !== "unaided";
}
