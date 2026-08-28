import { describe, it, expect } from "vitest";
import { compileStylesheet, declarationsFor, topLevelRules } from "./support/tokenAudit";

/**
 * The layout of the three scanning screens (Games, Stats, Weak opening), read
 * off the COMPILED stylesheet. jsdom never loads the sheet, so this is the only
 * tier below the agentic one where a layout rule is observable at all; contrast
 * and the actual rendering stay the Feature Path's job.
 *
 * These assertions state what the Player can see — columns that line up, a
 * hairline instead of a rule, figures pushed to the right — and deliberately pin
 * no colour: the hues were judged on the pilot, not here.
 */
const css = compileStylesheet();

describe("the Game table", () => {
  it("adds no rule of its own — it is a table and inherits the table rules", () => {
    // The reversal of US-13's "what is a list stays a list" pays off here: the
    // Game list used to carry its own grid, its own hairline and its own button
    // sizing. As a table it carries none of that, and a figure on /stats and a
    // date on / now share one rhythm because one set of rules draws both.
    for (const stale of [
      'ul[aria-label="games"] li',
      'ul[aria-label="games"] li [data-part=description] button',
    ]) {
      expect(declarationsFor(css, stale).size).toBe(0);
    }
  });

  it("leaves its last three columns aligned to the start — they are words, not figures", () => {
    // Résultat, Cadence and État happen to be the last three cells, which is
    // exactly what the figure rule counts. Words pushed right leave a ragged
    // left edge down the column, so the Game table is excluded by name.
    expect(declarationsFor(css, 'tr > :nth-last-child(-n+3):not([scope="colgroup"])').size).toBe(0);
  });

  it("styles the 'analysée' badge by its own label, not by the cell around it", () => {
    // The badge moved from a list row's `state` part to an `État` cell. A
    // selector naming its container stopped matching without one test failing —
    // jsdom does not load the sheet — so it is pinned to the one thing that did
    // not change: its accessible name.
    const badge = declarationsFor(css, '[aria-label="analysée"]');
    expect(badge.get("background")).toBe("var(--tint-ok)");
    expect(badge.get("border")).toBe("1px solid var(--tint-ok-ink)");
    expect(badge.get("border-radius")).toBe("var(--radius-pill)");
  });
});

describe("the import form's groups", () => {
  const form = declarationsFor(css, 'form[aria-label="import"]');

  it("lays the username and the two range bounds out as one reflowing row", () => {
    // Side by side, `Du` next to `Au`, is what makes the range read as a range
    // rather than as three unrelated fields stacked down the page. `auto-fit`
    // rather than a designed breakpoint: it folds on its own when there is no
    // room (PRD — fluid, no breakpoint).
    expect(form.get("display")).toBe("grid");
    expect(form.get("grid-template-columns")).toContain("auto-fit");
    expect(form.get("grid-template-columns")).toContain("minmax(11rem, 1fr)");
  });

  it("gives the cadence set and the action the form's whole width", () => {
    // The fieldset is a set, not a field: it spans, so the four cadences read as
    // one group instead of being squeezed into a field-sized column.
    for (const selector of [
      'form[aria-label="import"] fieldset',
      'form[aria-label="import"] button[type="submit"]',
    ]) {
      // Sass emits `1 / -1` as `1/-1`; the span is the assertion, not the spacing.
      expect(declarationsFor(css, selector).get("grid-column")?.replace(/\s/g, "")).toBe("1/-1");
    }
  });

  it("keeps the action from stretching to the full width it is allowed", () => {
    const action = declarationsFor(css, 'form[aria-label="import"] button[type="submit"]');
    expect(action.get("justify-self")).toBe("start");
  });
});

describe("the tabular screens (Stats, Weak opening)", () => {
  it("makes a table fill its container and its cells share one rhythm", () => {
    const table = declarationsFor(css, "table");
    expect(table.get("border-collapse")).toBe("collapse");
    expect(table.get("inline-size")).toBe("100%");

    const cell = declarationsFor(css, "th");
    expect(cell.get("padding")).toBe("var(--space-2) var(--space-3)");
    expect(cell.get("text-align")).toBe("start");
  });

  it("makes the column headers read as headers", () => {
    const header = declarationsFor(css, "thead th");
    expect(header.get("color")).toBe("var(--ink-muted)");
    expect(header.get("font-size")).toBe("var(--text-s)");
    expect(header.get("border-block-end")).toBe("1px solid var(--border)");
  });

  it("right-aligns the three figure columns of both tables", () => {
    // Both tables end with the same three figure columns (Parties, Résultats,
    // Win rate), so counting from the END aligns them on both screens with one
    // rule and no class — and the group header, which spans, is left out.
    const figures = declarationsFor(
      css,
      'table:not([aria-label=parties]) tr > :nth-last-child(-n+3):not([scope="colgroup"])',
    );
    expect(figures.get("text-align")).toBe("end");
  });

  it("separates the body rows by a hairline so a line can be followed across", () => {
    expect(declarationsFor(css, "tbody tr + tr > *").get("border-block-start")).toBe(
      "1px solid var(--border)",
    );
  });

  it("uses no rule heavier than a hairline anywhere in a table or a list", () => {
    // "Rows are separated by spacing and at most a hairline; no heavy rules."
    const widths = topLevelRules(css)
      .filter(({ selectors }) => selectors.some((s) => /table|thead|tbody|tr|th|td|\bli\b/.test(s)))
      .flatMap(({ body }) => [...body.matchAll(/border[a-z-]*:\s*([\d.]+)px/g)])
      .map(([, px]) => Number(px));
    expect(widths.every((w) => w <= 1)).toBe(true);
  });
});

describe("a long label must not push the figures out of sight", () => {
  it("lets the leading cell wrap, while the figures keep holding their line", () => {
    // Found on screen with the real history: an `Opening` name runs past 60
    // characters, `nowrap` made the table far wider than its container, and the
    // five figure columns were scrolled out of view — the Player saw a column of
    // names and nothing else. A name is PROSE and may wrap; a figure is what must
    // not, or it stops being comparable down its column.
    // Both leading cells: /openings' name is a `td`, /stats' label a row header.
    for (const leading of ["tbody td:first-child", 'tbody th[scope="row"]']) {
      expect(declarationsFor(css, leading).get("white-space"), leading).toBe("normal");
    }
    expect(declarationsFor(css, "td").get("white-space")).toBe("nowrap");
  });
});

describe("the Stats table's row groups", () => {
  it("sets each group's own header apart from the rows it heads", () => {
    // "Par cadence" and "Par côté" are group headers, not data: on the sunk
    // ground, so a row is never read against the wrong heading.
    const groupHeader = declarationsFor(css, 'th[scope="colgroup"]');
    expect(groupHeader.get("background")).toBe("var(--ground-sunk)");
    expect(groupHeader.get("color")).toBe("var(--ink)");
    expect(groupHeader.get("font-size")).toBe("var(--text-s)");
  });

  it("opens a gap before a group so the three groups read as three blocks", () => {
    expect(declarationsFor(css, "tbody + tbody > tr:first-child > *").get("padding-block-start")).toBe(
      "var(--space-4)",
    );
  });
});

/**
 * The `Profile` list (US-11-01). Same rules as the Game list — constant columns,
 * a hairline between rows — plus the one this screen adds: the current Profile
 * is marked by WEIGHT AND A BORDER, never by colour alone, exactly as the
 * navigation marks the current screen.
 */
describe("the Profile list, and which Profile is current", () => {
  const row = declarationsFor(css, 'ul[aria-label="profils"] li');

  it("puts the account, the platform, the counters, the state and the actions in constant columns", () => {
    // The columns are the LIST's, not each row's, and the rows take them through
    // `subgrid`. Seen on screen with ten Profiles: sized per row, the current
    // row's columns drifted a few pixels away from the others' — its state cell
    // reads "Profil actuel" where the rest read "Sélectionner", and its bolder
    // text is wider. One set of tracks for the whole list is what actually makes
    // a column scannable; the row keeps its own box, so its hairline and its
    // current marker still paint (which `display: contents` would have lost).
    const list = declarationsFor(css, 'ul[aria-label="profils"]');
    expect(list.get("display")).toBe("grid");
    expect(list.get("grid-template-columns")).toBe("1fr auto auto auto auto");
    expect(row.get("display")).toBe("grid");
    expect(row.get("grid-template-columns")).toBe("subgrid");
    expect(row.get("grid-column")?.replace(/\s/g, "")).toBe("1/-1");
    expect(row.get("align-items")).toBe("center");
    expect(row.get("border-block-end")).toBe("1px solid var(--border)");
  });

  it("keeps a row compact enough that ten Profiles need no scrolling", () => {
    // The promise the issue makes and the only one a list CAN keep: rows small
    // enough that a realistic number of them fits, not "never scrolls".
    expect(row.get("padding-block")).toBe("var(--space-1)");
    expect(row.get("gap")).toBe("var(--space-3)");
  });

  it("marks the current Profile by weight and a border, not by colour alone", () => {
    const current = declarationsFor(css, 'ul[aria-label="profils"] li[data-current="true"]');
    expect(current.get("font-weight")).toBe("700");
    // A hairline, because no rule inside a list may be heavier — and it is the
    // third cue here, after the words "Profil actuel" and the weight.
    expect(current.get("border-inline-start")).toBe("1px solid var(--accent)");
  });
});

describe("the Profile list on a narrow screen", () => {
  const list = declarationsFor(css, 'ul[aria-label="profils"]');

  it("sizes itself to its own content, the way a table does inside a scroller", () => {
    // Measured on the FP of US-22 slice 01, at 380 px: the page had stopped
    // scrolling (365 into 380) and the container scrolled correctly, but the `ul`
    // itself still read as an overflowing box — 643 px of content in a 299 px box —
    // because a block-level grid takes its container's width where a `table` in
    // auto layout expands to its own min-content. Nothing was visible to the
    // Player, and that is exactly the problem: a permanent non-clean reading on
    // the screen this slice exists to fix is one a human re-explains at every
    // future pass, until it becomes an entry in an ignore-file.
    expect(list.get("min-inline-size")).toBe("max-content");
  });
});

describe("a mark in the move list belongs to its own Move", () => {
  const list = declarationsFor(css, 'ol[aria-label="moves"]');
  const item = declarationsFor(css, 'ol[aria-label="moves"] li');

  it("sits closer to the Move it judges than to the next one", () => {
    // Measured on the FP of 2026-08-28: 4 px before the mark and 4 px after it,
    // uniformly — the glyph sat exactly halfway between `e3` and `Be6`, giving the
    // eye no reason to attach `??` to either. Under `⚖` that only mislabelled
    // "there is a verdict here"; now that the mark says WHICH verdict, a
    // misattributed `??` mislabels the verdict itself. Chess notation glues the
    // mark to the Move it judges, and so does this.
    expect(item.get("gap")).toBe("var(--space-1)");
    expect(list.get("gap")).toBe("var(--space-1) var(--space-2)");
  });
});
