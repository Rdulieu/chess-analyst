import { describe, it, expect } from "vitest";
import { compileStylesheet, componentSources, declarationsFor } from "./support/tokenAudit";

/**
 * The three screens that do not fit the reading column: `/danger` as a grid of
 * cards, the explorer's board beside its candidates, and the Analyse row. Read
 * off the COMPILED stylesheet, like the lists-and-tables slice before it — jsdom
 * never loads the sheet, so this is the only tier below the agentic one where a
 * layout rule is observable at all.
 *
 * Every assertion here states something the Player can see (a grid that reflows,
 * a board that keeps its size, a curve wider than it is tall) and pins no colour.
 */
const css = compileStylesheet();

/** A layout length is relative or it is not a layout length (PRD — fluid, no
 *  designed breakpoint). `1px` hairlines and radii are not layout. */
const noAbsoluteLength = (value: string | undefined) =>
  expect(value ?? "").not.toMatch(/\b\d+(\.\d+)?px\b/);

describe("Danger positions, as a grid of cards", () => {
  const grid = declarationsFor(css, 'ul[aria-label="positions dangereuses"]');

  it("lays the entries out as a grid that reflows on its own", () => {
    // `auto-fit` and not a designed breakpoint: the number of columns follows
    // the window, so positions can be compared side by side at any width.
    expect(grid.get("display")).toBe("grid");
    expect(grid.get("grid-template-columns")).toContain("auto-fit");
    expect(grid.get("grid-template-columns")).toContain("minmax");
    expect(grid.get("gap")).toBe("var(--space-3)");
  });

  it("carves no pixel into the grid's own measurements", () => {
    noAbsoluteLength(grid.get("grid-template-columns"));
  });

  it("makes each entry one card, so its diagram and its figures hold together", () => {
    // The card is the `li`, not the `article` inside it: the review tint lands on
    // the `li` (`data-serious`), and a card painted over it would hide the very
    // highlight the screen exists to show.
    const card = declarationsFor(css, 'ul[aria-label="positions dangereuses"] li');
    expect(card.get("border")).toBe("1px solid var(--border)");
    expect(card.get("border-radius")).toBe("var(--radius)");
    expect(card.get("padding")).toBe("var(--space-3)");
  });

  it("keeps the diagram inside its card", () => {
    const diagram = declarationsFor(css, 'ul[aria-label="positions dangereuses"] article > div');
    expect(diagram.get("max-inline-size")).toBe("100%");
  });
});

describe("the explorer, with its candidates beside the board", () => {
  const screen = declarationsFor(css, 'section[aria-labelledby="explorer-heading"]');

  it("folds to one column on its own, with no width written down", () => {
    // `auto-fit`, like the danger grid: as many tracks as fit, one when none does.
    // A float was tried here first and could not do this — a box beside a float
    // overflows rather than wrapping when the room the float leaves is too narrow,
    // and a float capped at a *share* of the column never folds at all, so a phone
    // kept a half-width diagram for ever.
    expect(screen.get("display")).toBe("grid");
    expect(screen.get("grid-template-columns")).toContain("auto-fit");
    expect(screen.get("align-items")).toBe("start");
  });

  it("takes the wide column but not all of it, so two tracks are all that fit", () => {
    // Seen on screen the moment the explorer went wide: at 100rem `auto-fit` fitted
    // a THIRD track — holding nothing but the breadcrumb, candidates squeezed into
    // two lines each — and the diagram grew to 916px, pushing the candidate list
    // off the bottom. Two 24rem tracks fit in 64rem and three do not, so the count
    // is capped by the room and not by a trick, and the diagram lands at a size a
    // diagram wants to be.
    // The width and the track floor are raised TOGETHER: the floor is what caps the
    // count, so raising the width alone buys the third track straight back (three
    // 24rem tracks fit in 76rem; three 30rem tracks do not).
    expect(screen.get("max-inline-size")).toBe("76rem");
    expect(screen.get("grid-template-columns")).toContain("min(30rem, 100%)");
  });

  it("carves no pixel into the screen's own measurements", () => {
    noAbsoluteLength(screen.get("grid-template-columns"));
    noAbsoluteLength(screen.get("gap"));
  });

  it("puts the board beside the content that annotates it, and places nothing", () => {
    // Two items in the row — the diagram, and one pane holding the breadcrumb and
    // the candidates — so nothing is placed and nothing spans. The board used to
    // span its neighbours' two rows, and a spanning item forces the sum of the rows
    // it covers to fit it: the board's height was split between the breadcrumb's
    // row and the candidates', opening a 250px hole between them.
    expect(css).not.toContain("grid-row: span 2");
    const pane = declarationsFor(
      css,
      'section[aria-labelledby="explorer-heading"] > [data-pane="candidates"]',
    );
    expect(pane.get("display")).toBe("flex");
    expect(pane.get("flex-direction")).toBe("column");
  });

  it("gives the screen's own lines the whole width rather than a column", () => {
    // The heading, the side selector and the side-to-move line are the screen's,
    // not one column's. Sass emits `1 / -1` as `1/-1`; the span is the assertion.
    const full = declarationsFor(
      css,
      'section[aria-labelledby="explorer-heading"] > h2',
    ).get("grid-column");
    expect(full?.replace(/\s/g, "")).toBe("1/-1");
  });
});

describe("the Analyse row (US-14's arrangement, on fluid bases)", () => {
  const row = declarationsFor(css, '[data-row="board"]');
  const boardPane = declarationsFor(css, '[data-pane="board"]');
  const side = declarationsFor(css, '[data-pane="side"]');

  it("sets the board beside its annotations and folds when there is no room", () => {
    // Wrapping, not a breakpoint: the row becomes one column when the two panes
    // no longer fit, at whatever width that happens to be.
    expect(row.get("display")).toBe("flex");
    expect(row.get("flex-wrap")).toBe("wrap");
    expect(row.get("gap")).toBe("var(--space-4)");
    expect(row.get("align-items")).toBe("flex-start");
  });

  it("keeps the whole diagram on screen, and gives the curve everything it leaves", () => {
    // A position you have to scroll to read is not a position you can read, so the
    // diagram is bounded by what the window has left under everything still stacked
    // above the row — and a board being square, that one value is its width AND its
    // height. The curve then takes the rest: the row itself is NOT bounded, which is
    // the requester's call after seeing a bounded row leave two thirds of the page
    // empty. The board still grows towards three fifths; the budget is simply
    // whichever comes first.
    // Two terms, and the second is not redundant: on a window that extends past the
    // visible screen area — a maximized window behind a taskbar — the window is
    // TALLER than what the eye gets, so viewport units alone still put the bottom of
    // the diagram where nobody can see it. The `34rem` ceiling is what makes the
    // promise keepable whatever the window claims to be. Both boards share it.
    // Each screen's budget is the window less what THAT screen stacks above its
    // board: 180px on Analyse against 205px on the explorer, measured. One shared
    // number would have to serve the taller and cost the other 25px of diagram.
    expect(boardPane.get("max-inline-size")).toBe("min(100%, min(100dvh - 13rem, 34rem))");
    expect(
      declarationsFor(css, 'section[aria-labelledby="explorer-heading"] > div').get(
        "max-inline-size",
      ),
    ).toBe("min(100%, min(100dvh - 15rem, 34rem))");
    expect(row.get("max-inline-size")).toBeUndefined();
    expect(boardPane.get("flex-grow")).toBe("3");
    expect(side.get("flex-grow")).toBe("2");
    expect(side.get("min-inline-size")).toBe("0");
  });

  it("reserves the scrollbar's room, so a page that stops scrolling cannot widen the board", () => {
    // The last way the board could still change size under the Player: unchecking
    // the annotations shortened the page enough to remove the scrollbar, the layout
    // gained 15px, and the board took its share — a 9px GROWTH at 760–800px wide,
    // with the position unchanged, so a check on x and y alone passed it.
    expect(declarationsFor(css, "html").get("scrollbar-gutter")).toBe("stable");
  });

  it("reads the step controls and the readout beside the board, as the PRD's arrangement has it", () => {
    // They used to stack ABOVE the row, and that stack was what left the diagram no
    // height to be shown in full.
    const stepper = declarationsFor(css, '[data-part="stepper"]');
    expect(stepper.get("display")).toBe("flex");
    expect(stepper.get("gap")).toBe("var(--space-2)");
  });

  it("stacks the board and its own gauge, a hair apart", () => {
    // The bar is the board's gauge and lives in the board's pane, so it takes the
    // board's width and not the row's. A hair of space — `--space-1` — because
    // the bar reads as belonging to the diagram above it.
    expect(boardPane.get("display")).toBe("flex");
    expect(boardPane.get("flex-direction")).toBe("column");
    expect(boardPane.get("gap")).toBe("var(--space-1)");
  });

  it("measures the row in relative units only", () => {
    for (const pane of [row, boardPane, side]) {
      for (const value of pane.values()) noAbsoluteLength(value);
    }
  });

  it("keeps the move list compact, so a whole Game is read without scrolling past it", () => {
    // Forty half-moves beside the board rather than under it, and each one a
    // narrow chip: the list's own buttons drop the padding and the height a form
    // control needs, because forty of them are read as one block and not aimed at
    // one at a time.
    const move = declarationsFor(css, 'ol[aria-label="moves"] li button');
    expect(move.get("padding")).toBe("0 var(--space-1)");
    expect(move.get("font-size")).toBe("var(--text-s)");
    // The ROW gap is what compactness turns on — forty half-moves stacked — and
    // it is unchanged. The COLUMN gap doubled in US-22, so a mark belongs to the
    // Move it judges instead of sitting halfway to the next one; see
    // listsAndTables for why that asymmetry is deliberate.
    expect(declarationsFor(css, 'ol[aria-label="moves"]').get("gap")).toBe(
      "var(--space-1) var(--space-2)",
    );
    for (const value of move.values()) noAbsoluteLength(value);
  });

  it("keeps the curve landscape: its time axis stays wider than it is tall", () => {
    const curve = declarationsFor(css, '[data-part="curve"]');
    // 11rem tall inside a pane at least 20rem wide: landscape at every width the
    // row does not fold at, and still landscape once it has folded (the pane then
    // takes the whole column).
    expect(curve.get("block-size")).toBe("11rem");
    expect(curve.get("position")).toBe("relative");
    // The curve's own ground is Black's share — the constant player colour, not a
    // theme role, so the picture never lies about which side is which.
    expect(curve.get("background")).toBe("var(--black-share)");
    expect(curve.get("overflow")).toBe("hidden");
  });

  it("makes the curve's svg fill the box the sheet gives it", () => {
    // The component no longer sizes itself: it draws, the sheet sizes.
    const svg = declarationsFor(css, '[data-part="curve"] svg');
    expect(svg.get("inline-size")).toBe("100%");
    expect(svg.get("block-size")).toBe("100%");
    expect(svg.get("display")).toBe("block");
  });

  it("paints both of the curve's grounds from the constant player colours", () => {
    // White's share is the polygon over Black's ground; neither follows the theme,
    // so the picture cannot lie about which side is which. And the two marks the
    // Player reads on top of them are tokens too, chosen to clear 3:1 against
    // BOTH grounds — a `stroke` a `stroke=` attribute could never have carried.
    expect(declarationsFor(css, '[data-part="curve"] polygon').get("fill")).toBe(
      "var(--white-share)",
    );
    expect(declarationsFor(css, '[data-part="curve"] [data-mark=equality]').get("stroke")).toBe(
      "var(--curve-equality)",
    );
    expect(declarationsFor(css, '[data-part="curve"] [data-mark=cursor]').get("stroke")).toBe(
      "var(--curve-cursor)",
    );
  });

  it("needs no reserved slot to keep the board from jumping", () => {
    // The bar used to sit ABOVE the row, so losing it raised the board by exactly
    // its height — 8px of jump under the eyes of someone reading a position — and
    // the fix was a `:has()` rule reserving the slot. The bar now sits UNDER the
    // diagram inside the board's pane, so what disappears is below what the Player
    // is reading and nothing above it can move. The document order holds the
    // constraint; the rule is gone rather than kept as a second mechanism.
    expect(css).not.toContain("data-bar=winning-chances])");
    expect(declarationsFor(css, '[data-bar="winning-chances"]').get("block-size")).toBe(
      "var(--bar-height)",
    );
  });

  it("styles the winning-chances bar as a bar, in relative units", () => {
    const bar = declarationsFor(css, '[data-bar="winning-chances"]');
    expect(bar.get("display")).toBe("flex");
    expect(bar.get("inline-size")).toBe("100%");
    expect(bar.get("border")).toBe("1px solid var(--border)");
    expect(bar.get("overflow")).toBe("hidden");
  });
});

/**
 * The end of a story that started before there was a stylesheet: nine components
 * carried `style={{…}}` attributes because there was nowhere to put a selector
 * (PRD). After this slice there is somewhere, and the only inline styles left are
 * the ones no selector CAN express.
 */
describe("the layout inline styles, gone from the components", () => {
  /**
   * The exceptions, and every one is the same exception: a value computed PER
   * DATA POINT, which a stylesheet cannot hold. The bar's two shares are sized by
   * the Position's winning chances; the curve's markers are placed at the ply and
   * the share where the flawed Move was played; the Phase ribbon's segments are
   * each as wide as the share of the Game that Phase covers. `chess/arrows.ts` is
   * the last (one `hsla` per candidate) and holds no `style` attribute at all.
   *
   * The list is a **ceiling**, not a permission: a component joins it only when the
   * value genuinely comes from the data, and with the exact count it needs.
   */
  const PER_DATA_POINT: Record<string, number> = {
    "components/WinningChancesBar.tsx": 2,
    "components/EvaluationGraph.tsx": 1,
    "components/PhaseRibbon.tsx": 1,
  };

  const inlineStyles = (source: string) => source.match(/style=\{\{/g)?.length ?? 0;

  it.each(componentSources().filter(({ path }) => !(path in PER_DATA_POINT)))(
    "leaves not one inline style in $path",
    ({ source }) => {
      expect(inlineStyles(source)).toBe(0);
    },
  );

  it.each(Object.entries(PER_DATA_POINT))(
    "leaves %s exactly the inline styles its data computes",
    (path, expected) => {
      const source = componentSources().find((f) => f.path === path)!.source;
      expect(inlineStyles(source)).toBe(expected);
    },
  );
});

/**
 * The one item that belongs to no slice and to every screen: the checkboxes. They
 * are on the Game rows, on the cadence fieldset and on the annotations toggle, and
 * at night they were bright white squares — because a `prefers-color-scheme` media
 * query restyles what the SHEET paints and says nothing about what the browser
 * paints for itself. Reported by slice 04's Feature Path, fixed here.
 */
describe("the form controls the browser draws itself", () => {
  it("tells the browser the app has both themes, so its own widgets follow", () => {
    // `color-scheme` is the declaration — not `accent-color`. The white square was
    // an UNCHECKED box: a native widget rendered in the light scheme because the
    // page never said it had a dark one. This also darkens the scrollbars and the
    // caret for free, which no rule of ours could reach.
    // Read off the `:root` block textually rather than through `declarationsFor`,
    // which cannot see it: Sass emits `@charset` ahead of the first rule, so the
    // helper reads that rule as an at-rule and skips it.
    const root = css.slice(css.indexOf(":root"), css.indexOf("}"));
    expect(root).toContain("color-scheme: light dark");
  });

  it("draws a checked box in the app's accent rather than the browser's blue", () => {
    const box = declarationsFor(css, 'input[type="checkbox"]');
    expect(box.get("accent-color")).toBe("var(--accent)");
  });
});
