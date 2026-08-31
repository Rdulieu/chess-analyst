/**
 * When a keystroke is a **command** and not a character, and what the arrows mean.
 *
 * Neutral on purpose: it knows about focus and about the platform's own
 * conventions, and nothing about verdicts or readings. The reading route builds
 * its own table on top (`features/personal/shortcuts.ts`); the board uses the
 * arrow half directly. One set of guards, so the two cannot drift apart on the
 * question that matters most — whether the Player is typing.
 */

/**
 * Is this keystroke ours to interpret at all?
 *
 * Two refusals, and neither is defensive:
 *
 * - **A chord belongs to the browser or the operating system.** Ctrl, Meta and
 *   Alt are never ours.
 * - **Nothing is a command while the Player is typing.** Writing a `Note` writes
 *   text and nothing else; a `1` in a sentence is a `1`.
 */
export function isCommandKeystroke(event: {
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  target?: EventTarget | null;
}): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  return !isTyping(event.target);
}

/**
 * Which way the arrows step, or `null` when they are not ours.
 *
 * **A focused radio group keeps its native arrows.** Taking them away would break
 * a convention assistive technology takes for granted, and it is precisely the
 * kind of regression nothing in this suite watches — so nobody would see it.
 */
export function arrowStep(event: { key: string; target?: EventTarget | null }): -1 | 1 | null {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return null;
  /* **No `repeat` guard here, and none in `isCommandKeystroke` either.** Holding
     an arrow to skim the Game is a real way to read: it writes nothing, and the
     buttons cannot do it. The guard belongs to the commands that WRITE, and it
     lives with them (`features/personal/shortcuts.ts`) — putting it in this
     shared predicate cost exactly that, for the few minutes it was there. */
  if (inRadioGroup(event.target)) return null;
  return event.key === "ArrowRight" ? 1 : -1;
}

/** Is the Player writing? Then every key is a character and none is a command. */
function isTyping(target: EventTarget | null | undefined): boolean {
  if (!(target instanceof HTMLElement)) return false;
  // Both, because they disagree: jsdom leaves `isContentEditable` undefined while
  // honouring the attribute, so a guard resting on the property alone is a guard
  // no test below the browser can hold.
  if (target.isContentEditable || target.getAttribute("contenteditable") === "true") return true;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  // A radio, a checkbox or a button is an INPUT nobody types into. Excluding
  // them here would cost the Player their shortcuts for the rest of the Move,
  // only because they last reached a control with the mouse.
  return !["radio", "checkbox", "button", "submit", "reset"].includes(
    (target as HTMLInputElement).type,
  );
}

function inRadioGroup(target: EventTarget | null | undefined): boolean {
  return target instanceof HTMLInputElement && target.type === "radio";
}
