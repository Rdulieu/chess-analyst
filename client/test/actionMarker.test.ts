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

/**
 * The Move being looked at (US-23, D5).
 *
 * `aria-current="true"` was posted on the right chip from the day the list
 * existed, and NO rule of the sheet read it: the Player on a screen reader knew
 * where they were, the one looking did not.
 *
 * The project's pattern for the current screen — weight and a border, never
 * colour alone — does not transpose. The navigation carries eight tabs on one
 * line; this list carries eighty chips in a wrapping flex. Weight widens the
 * glyphs, an added border adds two pixels to the box, and either way everything
 * after it shifts and the rows recompose on every arrow — the very defect
 * ADR-0021 has just closed.
 */
describe("the chip of the Move being looked at", () => {
  const chip = declarationsOfRule(css, 'ol[aria-label=moves] li button[aria-current=true]');

  it("inverts ink and ground, which is a negative rather than a tint", () => {
    // Perceptible with no colour perception at all, so ADR-0013's rule about a
    // chromatic-only cue is not in play: nothing here is a hue.
    expect(chip.get("background")).toBeDefined();
    expect(chip.get("color")).toBeDefined();
    expect(chip.get("background")).not.toBe(chip.get("color"));
  });

  it("changes no weight and adds no character", () => {
    // Both would reflow the rows, which is exactly what must not happen.
    expect(chip.has("font-weight")).toBe(false);
    expect(chip.has("font-size")).toBe(false);
    expect(chip.has("content")).toBe(false);
    expect(chip.has("padding")).toBe(false);
    for (const property of [...chip.keys()]) {
      expect(property.startsWith("padding"), `${property} would resize the box`).toBe(false);
      expect(property.startsWith("margin"), `${property} would move the box`).toBe(false);
    }
  });

  it("borrows the border every chip already declares, so no box changes size", () => {
    // The border is declared on ALL chips and left transparent off the current
    // one: adding it only here would add two pixels only here.
    const every = declarationsOfRule(css, 'ol[aria-label=moves] li button');
    expect(every.get("border")).toMatch(/1px solid/);
    expect(every.get("border")).toMatch(/transparent/);
    // And the current chip only recolours it — it does not add width.
    expect(chip.get("border-width")).toBeUndefined();
  });
});

/**
 * A row of actions keeps its actions apart.
 *
 * Found by the FP of US-23-05: the two links of the reading route's slot measured
 * a **0 px** gap — touching tap targets, and one line a screen reader reads as
 * "Confronter ma lecture au moteurRetour à l'analyse de cette partie". The cause
 * was not that slot: NO rule declared a gap for `[data-part="actions"]` anywhere,
 * and JSX strips the whitespace between two elements on separate lines. So every
 * such row in the app — the seal's own confirmation, the re-analysis card, the
 * Profiles header — had the same 0 px, and a `{" "}` in one place would have
 * fixed one of them.
 */
describe("a row of actions", () => {
  const actions = declarationsFor(css, '[data-part="actions"]');

  it("declares the space between its actions, rather than leaning on markup", () => {
    expect(actions.get("display")).toBe("flex");
    expect(actions.get("gap")).toBeDefined();
    // Wrapping, because two named actions do not always fit a narrow screen and
    // the alternative is a row that scrolls or clips.
    expect(actions.get("flex-wrap")).toBe("wrap");
  });
});

/**
 * The verdict control, as a segmented one (US-23, D8).
 *
 * Read off the compiled sheet, which is the only tier below the agentic one where
 * a layout rule is observable at all — jsdom never loads the stylesheet. No colour
 * is pinned: the two new tints were judged on the pilot, and what matters here is
 * that the row cannot reflow and cannot change size when chosen.
 */
describe("the verdict control", () => {
  it("stacks its five values in a column, so they cannot reflow into tiny targets", () => {
    const fieldset = declarationsFor(css, '[data-part="declared-severity"]');
    expect(fieldset.get("display")).toBe("flex");
    expect(fieldset.get("flex-direction")).toBe("column");
    // Nothing wraps: a column of rows has no reflow to depend on the width.
    expect(fieldset.get("flex-wrap")).toBeUndefined();
  });

  it("gives every row a border, so choosing one changes no row's size", () => {
    // The same device as the move list's current chip: declared everywhere,
    // recoloured on the chosen one. A border added only when checked would add
    // two pixels only there, and the four other rows would move.
    const row = declarationsFor(css, '[data-part="declared-severity"] label');
    expect(row.get("border")).toMatch(/1px solid/);
    expect(row.get("display")).toBe("grid");
    // ONE line per row: glyph, word, claim in three tracks of a single row. The
    // stacked version cost 66 px a row against ~36, and the requester arbitrated
    // the measurement in favour of the compact one (2026-09-01) — the claims stay
    // permanently visible either way, which is what could not be traded.
    expect(row.get("grid-template-columns")).toBe("1.5em auto 1fr");
    for (const part of ["glyph", "word", "claim"]) {
      const cell = declarationsFor(
        css,
        `[data-part="declared-severity"] label [data-part="${part}"]`,
      );
      expect(cell.get("grid-row"), `${part} must share the row's single line`).toBe("1");
    }

    const chosen = declarationsFor(css, '[data-part="declared-severity"] label:has(input:checked)');
    expect(chosen.get("border-color")).toBeDefined();
    expect(chosen.has("border-width")).toBe(false);
    for (const property of [...chosen.keys()]) {
      expect(property.startsWith("padding"), `${property} would resize the row`).toBe(false);
      expect(property.startsWith("font-size"), `${property} would resize the row`).toBe(false);
    }
  });

  it("reinforces the chosen row with the verdict's own square token, ink included", () => {
    // The constant family, the same one the board's square uses, so the control
    // and the diagram agree on what a verdict looks like — and a constant ground
    // takes the constant ink with it.
    for (const severity of ["blunder", "mistake", "inaccuracy", "sound", "good"]) {
      const rule = declarationsFor(
        css,
        `[data-part="declared-severity"] label[data-verdict=${severity}]:has(input:checked)`,
      );
      expect(rule.get("background"), severity).toBe(`var(--square-${severity})`);
      expect(rule.get("color"), severity).toBe("var(--square-notation)");
    }
  });
});

describe("the radio under the row's appearance", () => {
  /*
   * The comment in the sheet always claimed "the input is the semantics, the glyph
   * is the appearance" — and for one commit it was false: both sat in the same
   * grid cell and the native circle was painted over the mark, so `✓` read as "Ø"
   * and `!` as "(!)" (measured by the FP at 84042fa, against the previous shape
   * where they stacked). The glyph is the non-chromatic cue ADR-0013 requires, so
   * an illegible glyph is not a cosmetic problem.
   *
   * The input stays in the accessibility tree — it IS the group — so it is
   * unpainted rather than removed, and the focus ring moves to the row.
   */
  it("drops the native box, so the glyph is what is drawn in that cell", () => {
    const input = declarationsFor(css, '[data-part="declared-severity"] label input');
    expect(input.get("appearance")).toBe("none");
    // Not display:none and not visibility:hidden: either would take the radio out
    // of the group and cost the arrows, the rank announcement and the focus.
    expect(input.get("display")).not.toBe("none");
    expect(input.get("visibility")).toBeUndefined();
  });

  it("draws the focus ring on the row, since the box that used to carry it is gone", () => {
    const focused = declarationsFor(
      css,
      '[data-part="declared-severity"] label:has(input:focus-visible)',
    );
    expect(focused.get("outline")).toMatch(/var\(--accent\)/);
    // Offset like every other focus ring in the app, so the keyboard journey reads
    // the same everywhere.
    expect(focused.get("outline-offset")).toBeDefined();
  });
});
