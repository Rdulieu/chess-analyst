# 05 — The dense screens: danger positions, explorer, and the Analyse row

Status: ready-for-agent

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

- [ ] Danger positions renders its entries as a reflowing grid of cards, using the wide variant.
- [ ] Each card keeps its diagram and its figures together as one unit.
- [ ] The grid reflows with the window width without a designed breakpoint.
- [ ] The explorer's board, side selector, breadcrumb and candidate list are arranged coherently, with
      the candidates near the board.
- [ ] The Analyse row keeps board and annotations side by side at comfortable widths, and folds into a
      single column when narrow.
- [ ] The board does not resize when the annotations are toggled.
- [ ] Unchecking the annotations does not collapse or visibly disturb the row's layout.
- [ ] The evaluation curve keeps a landscape aspect: its time axis stays wider than it is tall.
- [ ] No fixed pixel layout values remain: sizes are relative.
- [ ] **No layout inline style remains in any component** after this slice.
- [ ] No screen scrolls the page horizontally at any window width down to a narrow viewport.
- [ ] Everything holds in both themes, with text contrast at least 4.5:1 (3:1 for large text).
- [ ] Board orientation, arrow rendering, drill-down and move navigation all behave exactly as before.
- [ ] Build and the full test suite are green.

### Assigned here after slice 03 (decided, not open)

Slice 03 raised two things it deliberately left out of the tint migration. Both are settled and land
here, because this is the slice that owns the curve and the board:

- [ ] **The curve's equality line (2.92:1) and its cursor (2.93:1) become tokens** and clear the 3:1
      non-text threshold. They are unchanged US-14 values, so no regression — but they are two marks
      the Player reads *on* a drawing, which is exactly the argument that produced the `--square-*`
      family, and those were tokenised. Keeping a hex here for consistency with US-14 preserves the
      wrong consistency.
- [ ] **`--square-light` / `--square-dark` stop being dead tokens**: the board's base squares are
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

## Blocked by

- `02-tokens-and-the-app-chrome`
