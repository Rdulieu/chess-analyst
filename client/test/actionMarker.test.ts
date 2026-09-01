import { describe, it, expect } from "vitest";
import { compileStylesheet, declarationsFor, clientSources } from "./support/tokenAudit";

/**
 * The action marker, read off the COMPILED stylesheet (US-23, D2).
 *
 * The rule was in the sheet before this story and applied to ONE element of the
 * whole app. What was missing was never a rule — it was its generalisation. So
 * what is worth pinning is that the marker really does give a link the look of a
 * control, and that the generalisation is an appearance change: no colour is
 * pinned here (the hues were judged on the pilot), and no element type either
 * beyond the one this story deliberately changed.
 */
const css = compileStylesheet();

/**
 * The declarations of a rule named by its selector **verbatim**.
 *
 * `declarationsFor` splits a selector list on commas, which is right for every
 * other test and wrong for `:is(button, a[data-action])` — the comma is inside the
 * `:is()`, so the shared helper sees two selectors that do not exist. Rather than
 * change what every other test relies on, this reads the rule as written.
 */
function declarationsOfRule(sheet: string, selector: string): Map<string, string> {
  const found = new Map<string, string>();
  const at = sheet.indexOf(`\n${selector} {`);
  if (at === -1) return found;
  const body = sheet.slice(at + selector.length + 3, sheet.indexOf("}", at));
  for (const [, prop, value] of body.matchAll(/([a-z-]+)\s*:\s*([^;}]+)/g)) {
    found.set(prop.trim(), value.trim());
  }
  return found;
}

describe("a link that carries the action marker", () => {
  it("is drawn as a control, and not merely as underlined text", () => {
    // The sheet groups it with `button`, so the assertion is on the grouped
    // selector rather than on a copy of the declarations.
    const grouped = declarationsOfRule(css, ":is(button, a[data-action])");
    expect(grouped.size).toBeGreaterThan(0);
    // A control has a border, a padding and a hit area — that is what tells it
    // apart from a sentence. Which values they take is the sheet's business.
    for (const property of ["border", "padding", "cursor"]) {
      expect([...grouped.keys()].some((k) => k.startsWith(property))).toBe(true);
    }
  });

  it("stops looking like body text — the underline goes, and it takes a box", () => {
    const own = declarationsFor(css, "a[data-action]");
    expect(own.get("text-decoration")).toBe("none");
    expect(own.get("display")).toBe("inline-block");
  });
});

describe("what the generalisation must NOT have done", () => {
  it("left every act an anchor — no act navigates by program any more", () => {
    // The one element whose type was wrong is the Game row, and it became an
    // anchor. What must not have happened is the reverse: an act turned into a
    // button plus a programmatic navigation, which is what the sheet's own rule
    // exists against (it would lose middle-click and "open in a new tab").
    // `clientSources()` hands back the sources themselves, not their paths.
    const offenders = clientSources().filter((source) =>
      // A `navigate(...)` toward a Game's analysis is the shape that was removed.
      /navigate\(\s*[`"']\/analyse/.test(source),
    );
    expect(offenders).toEqual([]);
  });
});

describe("what does not move", () => {
  it("leaves the links written inside a sentence bare — a link in a sentence is a link", () => {
    // « …importez son historique » on three screens. Marking those would put a
    // control in the middle of a phrase, which is the opposite of reading well.
    const inSentence = clientSources().filter((source) =>
      /importez son historique/.test(source),
    );
    expect(inSentence.length).toBeGreaterThan(0);
    for (const source of inSentence) {
      const line = source
        .split("\n")
        .find((l) => l.includes("importez son historique"))!;
      expect(line).not.toContain("data-action");
    }
  });

  it("leaves the current-Profile banner alone", () => {
    const banner = clientSources().find((source) =>
      source.includes("CurrentProfileBanner") && source.includes("export function"),
    )!;
    expect(banner).not.toContain("data-action");
  });
});
