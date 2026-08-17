# 04 — Lists and tables, styled

Status: ready-for-agent

Implemented on the business-story integration branch **`integration/US-13-stylesheet`**: branch from
it and merge back into it, never into `develop`. Auto-merges into the integration branch once the
local check is green (build + tests + a green Feature Path, no blocking finding). The
`integration → develop` merge stays a human decision.

## Parent

`.scratch/stylesheet/PRD.md` — business story **US-13** in `BACKLOG.md`.

## What to build

The three screens whose value is *scanning a lot of rows* get their layout: the Games screen, the
Stats screen and the Weak opening screen.

The Game list stays a list and is laid out as rows: the checkbox, the Game's description and the
analysed badge sit in consistent columns down the whole list, so eighty entries can be swept with the
eye instead of read one by one. Rows are separated by spacing and a hairline, never by heavy rules.
The import form above it gets its finished form — fields grouped so the range reads as a range, the
cadence choices as a set, and the primary action visibly primary.

The Stats and Weak opening tables get table styling: column headers that read as headers, figures
right-aligned, tabular numerals so digits line up down a column, and enough row separation to follow
a line across. On Stats, the row groups (the overall Total, the per-cadence breakdown, the per-side
breakdown) must be visually distinguishable as groups, so a row is never read against the wrong
heading.

Nothing here invents a value or a control. Everything already on screen stays on screen, in the same
order, with the same accessible names.

## Acceptance criteria

- [ ] Game list entries align their checkbox, description and badge in consistent columns for the
      whole list.
- [ ] Rows are separated by spacing and at most a hairline; no heavy rules.
- [ ] A long Game list stays scannable, and its rows have a comfortable target size.
- [ ] The import form groups its username, its range and its cadence choices legibly, with the
      primary action visibly primary.
- [ ] Both tables show column headers that read as headers.
- [ ] Numeric columns are right-aligned and use tabular numerals, so digits align vertically.
- [ ] On the Stats table, the three row groups are visually distinguishable, each identifiable by its
      own header.
- [ ] Both tables scroll within their own container if they exceed the available width; the page never
      scrolls horizontally.
- [ ] Everything holds in both themes, with text contrast at least 4.5:1 (3:1 for large text).
- [ ] No value, control or accessible name is added, removed or reordered.
- [ ] No markup restructuring beyond adding classes: the structure came from slice 01.
- [ ] Build and the full test suite are green.

### Feature Path (FP)

1. Open the Games screen and fill the import form → the username, the month range and the cadence
   choices are each legible as their own group, and the action that starts the import is visibly the
   primary one.
2. Run an import and read the resulting list of dozens of Games → the entries align in constant
   columns, so the Player can sweep down one column (the results, or the analysed badges) without
   re-reading each line.
3. Select several Games and start an analysis → selection and the progress readout behave exactly as
   before.
4. Open the Stats screen → the results read as a table with aligned figures; for any row, the Player
   can tell at a glance whether it belongs to the overall Total, to a cadence or to a side, and can
   compare the same figure down a column.
5. Open the Weak opening screen → rows are comparable across the count, the tally and the `Win rate`,
   with digits aligned, and the ordering by game count is still visible.
6. Narrow the window on each of the three screens → nothing is clipped and the page does not scroll
   horizontally; a wide table scrolls inside its own container.
7. Switch the system preference to dark and re-read the three screens → everything stays legible.

Verify: UI first, reading computed styles for contrast in both themes. A real import gives the
volume that makes scannability meaningful.

## Blocked by

- `02-tokens-and-the-app-chrome`
