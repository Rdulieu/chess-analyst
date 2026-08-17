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
  const board = declarationsFor(css, 'section[aria-labelledby="explorer-heading"] > div');

  it("sets the board beside the content that annotates it", () => {
    // A float rather than a two-column grid, and deliberately: the breadcrumb and
    // the candidate list flow beside the board at a comfortable width and *under*
    // it when there is no room, with no breakpoint designed and not one element
    // moved in the document — so the reading order the screen reader follows is
    // exactly the one it followed before.
    expect(board.get("float")).toBe("inline-start");
    // A proportion, not `min(24rem, 100%)`: a box beside a float gets whatever
    // room the float leaves and OVERFLOWS rather than wrapping when that room is
    // narrower than its content (the breadcrumb, at 380px, pushed the page
    // sideways). Capped at a share of the column, the strip beside the board is
    // never too narrow to hold what flows into it — and still no breakpoint.
    expect(board.get("inline-size")).toContain("min(");
    expect(board.get("inline-size")).toMatch(/\d+%\)/);
  });

  it("measures the board in relative units only", () => {
    noAbsoluteLength(board.get("inline-size"));
    noAbsoluteLength(board.get("margin-inline-end"));
  });

  it("keeps the float inside its own screen", () => {
    // Without this the board escapes the bottom of its section and lands on the
    // next screen's content the moment the candidate list is short.
    expect(declarationsFor(css, 'section[aria-labelledby="explorer-heading"]').get("display")).toBe(
      "flow-root",
    );
  });
});

describe("the Analyse row (US-14's arrangement, on fluid bases)", () => {
  const row = declarationsFor(css, '[data-row="board"]');
  const boardPane = declarationsFor(css, '[data-pane="board"]');
  const annotations = declarationsFor(css, '[data-pane="annotations"]');

  it("sets the board beside its annotations and folds when there is no room", () => {
    // Wrapping, not a breakpoint: the row becomes one column when the two panes
    // no longer fit, at whatever width that happens to be.
    expect(row.get("display")).toBe("flex");
    expect(row.get("flex-wrap")).toBe("wrap");
    expect(row.get("gap")).toBe("var(--space-4)");
    expect(row.get("align-items")).toBe("flex-start");
  });

  it("gives the board a size of its own, so toggling the annotations cannot move it", () => {
    // `flex-grow: 0` is the whole US-14 constraint: the board is sized by its own
    // basis and never by what is or is not next to it, so unchecking the
    // annotations does not resize the position the Player is reading.
    expect(boardPane.get("flex-grow")).toBe("0");
    expect(boardPane.get("flex-basis")).toBe("22.5rem");
    expect(boardPane.get("max-inline-size")).toBe("100%");
  });

  it("lets the annotations take the width the board does not", () => {
    expect(annotations.get("flex-grow")).toBe("1");
    // A basis it can fall below only by wrapping: squeezed thinner than this the
    // curve would stop being a time axis.
    expect(annotations.get("flex-basis")).toBe("20rem");
    expect(annotations.get("min-inline-size")).toBe("0");
  });

  it("measures the row in relative units only", () => {
    for (const pane of [row, boardPane, annotations]) {
      for (const value of pane.values()) noAbsoluteLength(value);
    }
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

  it("styles the winning-chances bar as a bar, in relative units", () => {
    const bar = declarationsFor(css, '[data-bar="winning-chances"]');
    expect(bar.get("display")).toBe("flex");
    expect(bar.get("block-size")).toBe("0.5rem");
    expect(bar.get("inline-size")).toBe("100%");
    expect(bar.get("border")).toBe("1px solid var(--border)");
    expect(bar.get("overflow")).toBe("hidden");
    noAbsoluteLength(bar.get("block-size"));
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
   * The two exceptions, and both are the same exception: a value computed PER
   * DATA POINT, which a stylesheet cannot hold. The bar's two shares are sized by
   * the Position's winning chances; the curve's markers are placed at the ply and
   * the share where the flawed Move was played. `chess/arrows.ts` is the third
   * (one `hsla` per candidate) and holds no `style` attribute at all.
   */
  const PER_DATA_POINT: Record<string, number> = {
    "components/WinningChancesBar.tsx": 2,
    "components/EvaluationGraph.tsx": 1,
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
