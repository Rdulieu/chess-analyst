import { useEffect } from "react";

import { arrowStep, isCommandKeystroke } from "../../components/keyboard";
import { DECLARED_SEVERITIES, type DeclaredSeverity } from "../../types";

/**
 * What a keystroke asks the reading route to do — or nothing, which is the answer
 * most of the time and the one this module exists to get right.
 */
export type ReadingCommand =
  | { kind: "verdict"; severity: DeclaredSeverity }
  | { kind: "step"; delta: -1 | 1 }
  | { kind: "keyMoment" };

/** Enough of a `KeyboardEvent` to decide, so the table is testable as a table. */
export interface Keystroke {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  target?: EventTarget | null;
}

/**
 * The reading route's keyboard: **global commands that do not move the focus.**
 *
 * | key | effect |
 * | --- | --- |
 * | `1`…`5` | the verdict, in the order the screen shows it — worst to best |
 * | `←` `→` | previous / next Move |
 * | `k` | toggle the `Key moment` |
 *
 * Criterion 40 of US-16a wanted "few clicks, Move after Move". It was held for
 * the verdict alone, and with a mouse; the app had no keyboard shortcut at all,
 * and these are its first.
 *
 * **Not moving the focus is the design, not a detail.** Posing a verdict from the
 * keyboard is deliberately not clicking a radio: if it were, the focus would land
 * in the radio group and the arrows would then walk the five values instead of
 * changing Move — and the loop "verdict, next Move, verdict" is the whole point.
 *
 * The digits map to `DECLARED_SEVERITIES` **by position**, so there is nothing
 * arbitrary to memorise: what the screen shows from top to bottom is what `1` to
 * `5` pose, and the two orders cannot drift because there is only one.
 */
export function commandFor(event: Keystroke): ReadingCommand | null {
  if (!isCommandKeystroke(event)) return null;

  const digit = DECLARED_SEVERITIES.findIndex((_, i) => event.key === String(i + 1));
  if (digit !== -1) return { kind: "verdict", severity: DECLARED_SEVERITIES[digit] };

  if (event.key === "k" || event.key === "K") return { kind: "keyMoment" };

  const delta = arrowStep(event);
  return delta === null ? null : { kind: "step", delta };
}

/**
 * The commands, live on the document — which is what "global" means here, and why
 * nothing on screen has to hold the focus for them to work.
 *
 * `keydown` and not `keypress`: the arrows produce no character.
 */
export function useReadingShortcuts(run: ((command: ReadingCommand) => void) | null) {
  useEffect(() => {
    if (!run) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const command = commandFor(event);
      if (!command) return;
      // Only once it is known to be ours. Swallowing a key we then ignore would
      // take the Player's own browser shortcuts away from them.
      event.preventDefault();
      run(command);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [run]);
}
