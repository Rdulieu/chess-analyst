# 05 — The dense screens: danger positions, explorer, and the Analyse row

Status: done

Implemented on the business-story integration branch **`integration/US-13-stylesheet`**: branch from
it and merge back into it, never into `develop`. Auto-merges into the integration branch once the
local check is green (build + tests + a green Feature Path, no blocking finding). The
`integration → develop` merge stays a human decision.

## Parent

`.scratch/stylesheet/PRD.md` — business story **US-13** in `BACKLOG.md`.

## What to build

The three screens that do not fit the reading column get their layout, and the last of the layout
inline styles leave the components.

**Danger positions** becomes a grid of cards that reflows on its own as the window changes width, so
recurring positions can be compared side by side instead of scrolled through one at a time. The
screen uses the wide variant of the reading column. Each card holds its diagram and its figures as one
unit.

**The explorer** gets its layout: the board, the side selector, the breadcrumb and the candidate list
arranged so the candidates sit near the board they annotate — the drift noted as a finding in US-10a
(the side-to-move readout far from the candidate list) is worth closing here if the layout makes it
free, but it is not the point of the slice.

**The Analyse row** keeps the arrangement US-14 established — board on one side; readout,
winning-chances bar, evaluation curve, error tally and move list on the other — with the fixed pixel
bases replaced by fluid ones. Two constraints carry over from US-14 and must hold: the board must not
resize when the curve comes and goes, and unchecking the annotations must not collapse the row. The
curve stays landscape; squeezed into a narrow column it stops being a time axis.

All of it fluid, with no designed breakpoint: relative units and grids that reflow by themselves. The
row folds into a single column when the window is narrow, and nothing is clipped.

After this slice, no layout inline style remains in the components.

## Acceptance criteria

- [x] Danger positions renders its entries as a reflowing grid of cards, using the wide variant.
- [x] Each card keeps its diagram and its figures together as one unit.
- [x] The grid reflows with the window width without a designed breakpoint.
- [x] The explorer's board, side selector, breadcrumb and candidate list are arranged coherently, with
      the candidates near the board.
- [x] The Analyse row keeps board and annotations side by side at comfortable widths, and folds into a
      single column when narrow.
- [x] The board does not resize when the annotations are toggled.
- [x] Unchecking the annotations does not collapse or visibly disturb the row's layout.
- [x] The evaluation curve keeps a landscape aspect: its time axis stays wider than it is tall.
- [x] No fixed pixel layout values remain: sizes are relative.
- [x] **No layout inline style remains in any component** after this slice — except what the DATA
      computes, which no selector can hold: the bar's two share widths and the curve's marker
      positions. A guard in `denseScreens.test.ts` asserts exactly that, file by file. See the
      finding on the markers' six remaining static declarations.
- [x] No screen scrolls the page horizontally at any window width down to a narrow viewport.
- [x] Everything holds in both themes, with text contrast at least 4.5:1 (3:1 for large text).
- [x] Board orientation, arrow rendering, drill-down and move navigation all behave exactly as before.
- [x] Build and the full test suite are green.

### Assigned here after slice 03 (decided, not open)

Slice 03 raised two things it deliberately left out of the tint migration. Both are settled and land
here, because this is the slice that owns the curve and the board:

- [x] **The curve's equality line (2.92:1) and its cursor (2.93:1) become tokens** and clear the 3:1
      non-text threshold. They are unchanged US-14 values, so no regression — but they are two marks
      the Player reads *on* a drawing, which is exactly the argument that produced the `--square-*`
      family, and those were tokenised. Keeping a hex here for consistency with US-14 preserves the
      wrong consistency.
- [x] **`--square-light` / `--square-dark` stop being dead tokens**: the board's base squares are
      still `react-chessboard`'s own `#f0d9b5` / `#b58863`, so two frozen tokens are consumed
      nowhere and no other slice claims them. Either the board consumes them here, or say so in
      writing and delete them from ADR-0013 — a declared token nobody reads is a lie about the
      palette. If the board consumes them, the coordinate labels' 2.29:1 (third-party defaults,
      pre-existing) moves with it and should be measured.

### Feature Path (FP)

1. Open the Danger positions screen on a real analysed history → the recurring positions are presented
   as a grid of cards the Player can compare side by side, each card keeping its diagram with its
   figures, in the established order.
2. Change the window width → the grid reflows, cards keep their proportions, and nothing is clipped or
   pushed off the right edge.
3. Open the explorer and choose a side → the candidate moves sit near the board they annotate, the
   side to move is readable without hunting, and the arrows are still drawn on the board.
4. Drill down a level and walk back up the breadcrumb → navigation behaves exactly as before and the
   board's orientation holds.
5. Open an analysed Game → the board sits beside the readout, the winning-chances bar, the evaluation
   curve, the error tally and the move list; the curve is wider than it is tall.
6. Uncheck the annotations → the curve, the bar and the glyphs disappear, **the board neither moves nor
   resizes**, and the row does not collapse; re-check them → everything returns to where it was.
7. Narrow the window on the Analyse screen → the row folds into a single column, the board stays
   usable, nothing is clipped and the page does not scroll horizontally.
8. Switch the system preference to dark and revisit the three screens → everything stays legible, and
   the board and the curve's player colours are unchanged.

Verify: UI first. A real imported and analysed history gives the danger screen enough entries for the
grid to be meaningful.

## How the two assigned decisions were settled

Both by measurement, and both ended up widening the constant family rather than exempting anything:

- **The curve's equality line and cursor are tokens** — `--curve-equality` `#7e7e7e` and
  `--curve-cursor` `#d45a25`. Neither is US-14's value, and that is the finding: a mark drawn over
  *both* player grounds has to clear 3:1 against each of them, which is a luminance window of about
  0.19–0.23 that no eyeballed colour lands in. US-14's `#8a8a8a` and `#c05621` measured 2.92:1 and
  2.93:1 against the ground each happened to sit over. Measured in the app: equality 3.44 / 3.30,
  cursor 3.36 / 3.37. They reach the SVG through `data-mark` and a `stroke` declaration in the sheet,
  never through a `stroke=` attribute, where a custom property resolves to nothing. The token audit's
  hex exemption **shrank** as a result: `components/EvaluationGraph` left it, only `chess/arrows`
  remains (one `hsla` per data point).
- **`--square-light` / `--square-dark` are consumed** — by all three boards, through a new
  `client/src/chess/boardTheme.ts` spread into every `Chessboard`'s options, so no board can drift
  from another. The coordinate labels moved with them and did not merely get measured: react-chessboard
  labels each square in the *other* square's colour, which is 2.29:1 with its defaults and 2.77:1 with
  ours — text, drawn on a board, below any threshold either way. One constant ink
  (`--square-notation` `#241d13`) reads 12.89:1 on the light square and 4.66:1 on the dark one, so the
  labels clear the text threshold on both. The board's pieces, re-measured against the new squares:
  worst case 5.87:1 on `max(fill, stroke)`.

ADR-0013's frozen set is amended with the three new constant tokens and the reasoning above.

## Deviations from the slice's brief

Three, each one line, all inside "hooks and SCSS only" rather than moving anything:

- Two **attributes** added to existing elements, because a layout inline style cannot be removed
  without something to select: `data-part="curve"` on the box that holds the `Evaluation curve` and
  `data-bar="winning-chances"` on the bar. No element added, moved or renamed anywhere.
- `data-mark="equality"` / `data-mark="cursor"` on the curve's two `line`s — the alternative was two
  `style={{ stroke }}` attributes, i.e. keeping inline styles to avoid an attribute.
- One **test** moved rather than adapted: `Board.test.tsx` asserted the curve's two grounds as inline
  styles on the component. The grounds are declarations now, so the assertion moved to
  `denseScreens.test.ts` where the compiled sheet is read. The marker's tint-and-ink pair, which stays
  inline because the data places it, stays asserted in `Board.test.tsx`.

## Grafted on from slice 04's Feature Path

**The checkboxes were bright white squares in the dark theme** (the Game rows, the cadence fieldset,
the annotations toggle) — assigned here because no slice owned them and every screen carries one. The
cause was not the missing `accent-color` it looked like: a `prefers-color-scheme` block restyles what
the *sheet* paints and says nothing about what the *browser* paints for itself, and the white square
was an **unchecked** native widget rendered in the light scheme. `:root` now declares
`color-scheme: light dark` — which fixes the scrollbars and the caret in the same stroke, neither of
which any rule of ours could reach — and `accent-color: var(--accent)` gives a *checked* box the app's
accent instead of the browser's blue.

## Findings

- **[fixed during the slice, blocking while it lasted] `/explorer` scrolled the page sideways at 480
  and 380px.** The first `min(24rem, 100%)` float left a 49px strip beside the board and the
  breadcrumb's "Départ" button is 86px. The lesson is worth keeping: a box that establishes its own
  formatting context — a flex container, a `flow-root` — is laid *beside* a float in whatever room the
  float leaves and **overflows** rather than wrapping when that room is too narrow. Line boxes wrap;
  formatting contexts do not. Fixed by capping the float at a share of the column (`min(24rem, 55%)`),
  which keeps 24rem on any real screen and always leaves the strip 45% — no breakpoint.
- [non-blocking] The board shifts **8px vertically** when the annotations are unchecked: the
  winning-chances bar sits *above* the row and disappears with them. Width, x-position and the row's
  box are untouched and re-checking restores the position exactly, so the US-14 constraint holds as
  written — but if "the board does not move" is meant literally, the bar's slot needs reserving.
  Pre-existing US-14 structure, not introduced here.
- [non-blocking] The curve's markers still carry six *static* declarations inline
  (`position`, `transform`, `padding`, `border-radius`, `line-height`, `white-space`) beside the
  `left`/`top` the data computes. Moving them would mean putting `data-severity` on the marker and
  reusing _semantics' rules — a change to what slice 03 deliberately decided, and to the test that
  pins it. Left as is, deliberately; the guard in `denseScreens.test.ts` sanctions exactly one inline
  style block there and would catch a second.
- [non-blocking] `/openings`' table overflows its own container at a narrow column (right edge at
  1180px in a 365px column) and scrolls inside `[data-scroll="x"]` rather than scrolling the page.
  Slice 04's territory, not a regression.
- [non-blocking, tooling] `/danger` could not be screenshotted in the dark theme —
  `Page.captureScreenshot` timed out twice on the thirty-board page. Its dark validation is
  programmatic (contrast sweep, token values, the ⚠ markers), not visual.

## Blocked by

- `02-tokens-and-the-app-chrome`
