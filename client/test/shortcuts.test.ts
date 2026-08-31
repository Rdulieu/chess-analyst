import { describe, it, expect } from "vitest";
import { commandFor } from "../src/features/personal/shortcuts";
import { arrowStep } from "../src/components/keyboard";
import { DECLARED_SEVERITIES } from "../src/types";

/**
 * The reading route's keyboard, as a table. The route's own tests drive the real
 * screen; these are the edge cases — which keystrokes are NOT ours, which is most
 * of them and the part that is easy to get wrong in a way nobody notices.
 */
const el = (html: string) => {
  const host = document.createElement("div");
  host.innerHTML = html;
  return host.firstElementChild as HTMLElement;
};

describe("which keystrokes the reading route claims", () => {
  it("maps 1 to 5 onto the five verdicts by POSITION, so the two orders cannot drift", () => {
    // Not a second literal list: what the screen shows top to bottom is what the
    // digits pose, because there is only one order and this reads it.
    for (const [i, severity] of DECLARED_SEVERITIES.entries()) {
      expect(commandFor({ key: String(i + 1) })).toEqual({ kind: "verdict", severity });
    }
  });

  it("claims no sixth digit", () => {
    expect(commandFor({ key: "6" })).toBeNull();
    expect(commandFor({ key: "0" })).toBeNull();
  });

  it("steps on the arrows, and toggles the Key moment on k", () => {
    expect(commandFor({ key: "ArrowRight" })).toEqual({ kind: "step", delta: 1 });
    expect(commandFor({ key: "ArrowLeft" })).toEqual({ kind: "step", delta: -1 });
    expect(commandFor({ key: "k" })).toEqual({ kind: "keyMoment" });
    // Caps lock is not a different intention.
    expect(commandFor({ key: "K" })).toEqual({ kind: "keyMoment" });
  });

  it("takes a held key as ONE intention, because that is what it is", () => {
    // Measured 2026-08-31: leaning on `1` for nine repeats sent nine identical
    // writes, and a finger resting on `k` toggled the pivot on and off at the
    // operating system's repeat rate. Idempotent, so nothing was corrupted — and
    // still not what the Player asked for.
    expect(commandFor({ key: "1", repeat: true })).toBeNull();
    expect(commandFor({ key: "k", repeat: true })).toBeNull();
    // Ten deliberate presses are still ten commands: the guard reads the flag the
    // browser sets on auto-repeat, not a rate of its own.
    expect(commandFor({ key: "1", repeat: false })).toEqual({ kind: "verdict", severity: "blunder" });
  });

  it("leaves chords alone — they belong to the browser and the system", () => {
    expect(commandFor({ key: "1", ctrlKey: true })).toBeNull();
    expect(commandFor({ key: "ArrowRight", metaKey: true })).toBeNull();
    expect(commandFor({ key: "k", altKey: true })).toBeNull();
  });
});

describe("holding an arrow, which is a way of reading", () => {
  it("keeps stepping on repeat — it writes nothing, and the buttons cannot do it", () => {
    // The one command a held key should keep giving. Skimming a Game with the
    // arrow down is real reading; the repeat guard on the writing commands must
    // not cost it.
    expect(arrowStep({ key: "ArrowRight" })).toBe(1);
    // Through the reading route's own table too, which is what `Board` and the
    // panel both go through: the repeat guard must reach the writing commands and
    // stop there. Written the wrong way round first, and this is what caught it.
    expect(commandFor({ key: "ArrowRight", repeat: true })).toEqual({ kind: "step", delta: 1 });
    expect(commandFor({ key: "ArrowLeft", repeat: true })).toEqual({ kind: "step", delta: -1 });
  });
});

describe("what silences the whole table", () => {
  it("a Note being typed: every key is a character and none is a command", () => {
    const box = el("<textarea></textarea>");
    for (const key of ["1", "5", "k", "ArrowLeft", "ArrowRight"]) {
      expect(commandFor({ key, target: box })).toBeNull();
    }
  });

  it("any text field, not only the Note — a username is typed too", () => {
    expect(commandFor({ key: "1", target: el('<input type="text" />') })).toBeNull();
    expect(commandFor({ key: "1", target: el('<input type="month" />') })).toBeNull();
    expect(commandFor({ key: "1", target: el("<select></select>") })).toBeNull();
    expect(commandFor({ key: "1", target: el('<div contenteditable="true"></div>') })).toBeNull();
  });

  it("but NOT a radio or a checkbox, which nobody types into", () => {
    // Reaching a control with the mouse must not cost the Player their shortcuts
    // for the rest of the Move.
    expect(commandFor({ key: "1", target: el('<input type="radio" />') })).toEqual({
      kind: "verdict",
      severity: "blunder",
    });
    expect(commandFor({ key: "k", target: el('<input type="checkbox" />') })).toEqual({
      kind: "keyMoment",
    });
  });

  it("a focused radio group keeps its ARROWS, and only its arrows", () => {
    // The one thing the platform already owns here. Taking it away would break a
    // convention assistive technology assumes, and nothing in this suite watches
    // for that — so nobody would ever see it.
    const radio = el('<input type="radio" />');
    expect(commandFor({ key: "ArrowRight", target: radio })).toBeNull();
    expect(commandFor({ key: "ArrowLeft", target: radio })).toBeNull();
    expect(commandFor({ key: "3", target: radio })).toEqual({
      kind: "verdict",
      severity: "inaccuracy",
    });
  });
});
