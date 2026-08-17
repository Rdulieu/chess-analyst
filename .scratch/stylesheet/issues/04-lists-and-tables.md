# 04 — Lists and tables, styled

Status: done

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

- [x] Game list entries align their checkbox, description and badge in consistent columns for the
      whole list.
- [x] Rows are separated by spacing and at most a hairline; no heavy rules.
- [x] A long Game list stays scannable, and its rows have a comfortable target size.
- [x] The import form groups its username, its range and its cadence choices legibly, with the
      primary action visibly primary.
- [x] Both tables show column headers that read as headers.
- [x] Numeric columns are right-aligned and use tabular numerals, so digits align vertically.
- [x] On the Stats table, the three row groups are visually distinguishable, each identifiable by its
      own header.
- [x] Both tables scroll within their own container if they exceed the available width; the page never
      scrolls horizontally.
- [x] Everything holds in both themes, with text contrast at least 4.5:1 (3:1 for large text).
- [x] No value, control or accessible name is added, removed or reordered.
- [x] No markup restructuring beyond adding classes: the structure came from slice 01.
- [x] Build and the full test suite are green.

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

## FP run (feature/US-13-04-lists-and-tables)

Run by a subagent against the running app (server on 3104, client on 5204, the main checkout's
database copied in). **✅ green, no blocking finding.**

| Step | Result | Evidence |
|---|---|---|
| 1 — import form | ✅ | `display: grid`, `repeat(auto-fit, minmax(11rem, 1fr))` → three tracks at 1004px; the cadence `fieldset` and the submit both span `1 / -1`; `Import` is the only filled button (accent ground, weight 600) |
| 2 — import then read the list | ✅ | a real chess.com import (`hikaru`, 2025-01, blitz) took the list 166 → **499 Games**; `selection` x=172.5, `description` x=208.5, `state` x=744.2 — one value each across all 499 rows; row height 36.8px throughout, separator 0.8px |
| 3 — select and analyse | ✅ | selection enables the action with its label unchanged, progress read `12/141 → 132/141`, badge count 20 → 22, badges still at x=744.2, selection cleared |
| 4 — Stats | ✅ | collapsed table filling its container, quiet `thead th` (13px, `--ink-muted`, hairline), last three columns `text-align: end`, `tabular-nums` on every cell, group headers on `--ground-sunk` with `padding-top: 24px` |
| 5 — Weak opening | ✅ | 121 rows, first three columns start-aligned and last three end-aligned, ordering by game count still descending (133, 30, 22, 16…), 26 `data-weak` rows keeping their `⚠` marker |
| 6 — narrow viewport | ✅ | `scrollWidth === clientWidth` on all three screens at 380px and 700px; the openings container scrolls instead (1231/333 at 380px), the form folds to one column, the Game rows keep their three tracks |
| 7 — dark theme | ✅ | every token resolves, cues intact, layout identical |

Worst text contrast measured over every text element, against the background actually rendered
behind it: **5.75:1 light / 6.81:1 dark** on all three screens (the nav link, in both cases) —
zero failures. No unresolved `var(--…)`, no console error or warning.

## Findings

- **[non-blocking] Only the badge column's start edge is constant, not the description's end.** A row
  with no badge gives the state track 0px and lets the description take the slack (606.9px against
  519.6 + 87.3 on a badged row). Every badge still lands on the same x, so the sweep the criterion
  asks for works; what shifts is the boundary between columns 2 and 3. A minimum width on the state
  track would make it literal. Deliberately left as found — the requester's call.
- **[non-blocking] The checkboxes are still the browser's, and read as bright white squares at
  night** (no `accent-color`). A control concern rather than a list concern; noted so the forms work
  does not lose it.
- **[non-blocking] On Stats, a cadence with no games leaves its `Win rate` cell empty** rather than
  showing a dash, so that one column does not read straight down. Pre-existing content behaviour,
  untouched here.
- **[environment note] The FP mutated the worktree's throwaway database**: the import added 333 Games
  and two Games were analysed (166 → 499, 20 → 22 analysed). Legitimate under the dev-phase rules,
  and the database is the worktree's own copy. Worth recording that chess.com is reachable from here,
  so a later FP can rely on a real import.

## Deviations

None. **Not one line of markup was touched** — slice 01's `[data-part]`, `[data-scroll="x"]`,
`[scope="colgroup"]` and `data-weak` hooks carried the whole slice, which is what that slice was for.
