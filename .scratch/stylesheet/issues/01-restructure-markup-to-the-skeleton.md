# 01 — Restructure the markup to the page skeleton, with no style

Status: ready-for-agent

Implemented on the business-story integration branch **`integration/US-13-stylesheet`**: branch from
it and merge back into it, never into `develop`. Auto-merges into the integration branch once the
local check is green (build + tests + a green Feature Path, no blocking finding). The
`integration → develop` merge stays a human decision.

## Parent

`.scratch/stylesheet/PRD.md` — business story **US-13** in `BACKLOG.md`.

## What to build

Every screen's markup is restructured to the page skeleton frozen in the PRD, and **not one line of
style is added**. The app looks exactly as unstyled after this slice as before it; what changes is the
structure the stylesheet will later hang on.

This is the slice that adapts the existing component tests. It is deliberately the only one that
does: every later slice adds SCSS only, so a red test from then on can only be the style. That
diagnostic property is the whole reason this slice exists separately, and it is lost if any styling
leaks in here.

The skeleton to reach:

- Each screen is one section with an accessible name and an `h2`. Five screens already comply; the
  Games screen ("Mes parties") is the only one with neither and gains both, aligning it rather than
  keeping it an exception.
- The Stats screen becomes **a single table** whose Total, the per-cadence breakdown and the per-side
  breakdown are **row groups**. The former "Par cadence" / "Par côté" sub-headings stop being
  headings and become group headers; the accessible names currently carried by the two lists migrate
  onto those group headers. The results line keeps its games count, its win/draw/loss tally and its
  `Win rate`, now in cells.
- The Weak opening screen is already a table and keeps its structure; only the wrappers the skeleton
  needs are added.
- The Danger positions screen keeps a list, restructured so each entry is a self-contained card.
- The Game list keeps being a list; each entry gains the structure that lets a checkbox, the Game's
  description and the analysed badge sit in consistent columns.
- The Analyse screen keeps the row US-14 established (board on one side; readout, winning-chances
  bar, evaluation curve, error tally and move list on the other) and gains the wrappers a fluid
  layout needs. The inline layout values stay for now — they are removed in the slices that add the
  style — but nothing may depend on their being fixed.
- The import form's fields are structured label-above-field, and its primary action is
  distinguishable from secondary ones structurally (not yet visually).
- The explorer's breadcrumb and candidate lists are untouched.

The severity glyphs, the "à revoir ⚠" markers, the analysed badge's checkmark and word, and every
other non-chromatic cue stay exactly where they are.

## Acceptance criteria

- [ ] Each of the six screens renders one section with an accessible name and a level-2 heading.
- [ ] The Games screen has a heading naming it; it no longer differs structurally from the others.
- [ ] The Stats screen exposes its results as a single table: Total, each cadence and each side are
      rows, grouped, each group identifiable by its own header.
- [ ] The stats figures (games count, tally, `Win rate`) are in distinct cells, one concern per cell.
- [ ] The Danger positions entries are each a self-contained card in a list.
- [ ] Each Game list entry exposes its checkbox, its description control and its analysed badge as
      three distinct, consistently ordered parts.
- [ ] The Analyse screen still presents board and annotations as one row, with wrappers that do not
      assume fixed pixel sizes.
- [ ] No stylesheet, no SCSS file, no style dependency, and no new inline style is introduced by this
      slice.
- [ ] Every accessible name, role and reading order relied on elsewhere is preserved, except the
      Stats sub-headings and list names, which move onto table group headers as described.
- [ ] No behaviour changes: selection, navigation, stepping through moves, import and analysis all
      work exactly as before.
- [ ] The component tests are updated to the new structure and pass; they query roles and accessible
      names, never structure-specific internals.
- [ ] Build and the full test suite are green.

### Feature Path (FP)

Structural, not aesthetic — there is nothing to look at yet, and that is expected.

1. Open each of the six screens in turn → each one announces itself with its own heading, and the
   Player can tell which screen they are on without reading the URL.
2. On the Stats screen, read the results → they are presented as a table; for any row, the Player can
   tell which breakdown it belongs to (the overall Total, a cadence, or a side) and read its games
   count, its win/draw/loss tally and its `Win rate` as separate values.
3. On the Games screen, work the list → a Game can still be selected for analysis and opening one
   still navigates to its Analyse screen; an analysed Game still shows its analysed badge with both
   its checkmark and its word.
4. On the Danger positions screen → each recurring position is still presented as its own entry with
   its diagram and its figures, and the entries are still ordered as before.
5. Open an analysed Game → the board, the readout, the winning-chances bar, the evaluation curve, the
   error tally and the move list are all present; stepping forward and back and jumping to a move
   still update the position; the severity glyphs are still on the move list.
6. Uncheck the annotations → the curve, the bar and the glyphs disappear together and the board
   remains usable, exactly as before.
7. Across all six screens → no console error, and nothing that was previously reachable has become
   unreachable.

Verify: UI first. No backing-store probe is needed — this slice touches no data.

## Findings from the Feature Path (green, none blocking)

- **The Analyse DOM does not match this issue's prose.** Only the `Evaluation curve` and the error
  tally sit in `data-pane="annotations"`. The winning-chances bar is a sibling *above*
  `data-row="board"` and the move list a sibling *below* it, full width — exactly as US-14 left it,
  so no regression, but the layout slices must not assume the bar and the move list are already in
  the annotations column. Moving them is a layout decision and belongs to slice 05, not here.
- **Form fields without `id` or `name`** (the game-list checkboxes, the cadence checkboxes, the
  annotations toggle) — a pre-existing DevTools issue, not a console error. This slice reduced it by
  giving the three import fields real ids.

## Blocked by

None - can start immediately.
