Status: ready-for-agent

## Parent

`.scratch/evaluation-curve/PRD.md` (US-14 — `BACKLOG.md`).

Implemented on the business-story integration branch `integration/US-14-evaluation-graph` — branch
sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local check
(build + tests + this issue's Feature Path) is green.

## What to build

The `Evaluation curve` (`CONTEXT.md`), beside the board on the Analyse page: one glance at how a
whole Game went, where three readouts today only ever speak about a single `Move`.

End to end, from data already on the page to pixels:

- **A pure derivation** turning a Game's per-`Move` annotations into the drawable shape. Each side's
  share of the height is its **winning chances** — the same bounded quantity the advantage bar
  shows, and the scale `Inaccuracy`/`Mistake`/`Blunder` are defined on. **Never raw centipawns**:
  they have no bound to draw against, clamping them would be a new presentation rule, and the curve
  would then say something other than the bar sitting right beside it. A mate reads as a full area,
  with no special case. The numeric `Evaluation` (`+0.3`, `#3`) stays exactly where it already is —
  current-move readout and move list, untouched.
- **A dedicated component** for the curve, called by the board component — never inlined.
- **Rendered beside the board**, gated on the presence of annotations, exactly as the advantage bar
  already is. Left edge is **ply 0, the starting Position, at equality**; time runs left to right,
  one point per `Move` (half-move), uniform spacing. **One reference line only: the median**
  (equality) — no numeric scale, no grid.
- **The current `Move` stands out**: a cursor tracking the board's own navigation index. The graph is
  **not clickable** (deliberate — see the PRD), so nothing about navigation state moves.
- **`aria-hidden`**, and that is an accurate description rather than a shortcut: every figure the
  curve carries is already text in the same component (SAN + glyph + `Evaluation` per `Move` in the
  move list, the current-move readout, the advantage bar). Summarising 80 half-moves in a label
  would be noise; interpreting it would be new value, which this US does not produce. **Do not add
  any `role` or `aria-label` for testability** — reach the SVG through the rendered container, the
  way the existing square-tint tests already do.

No server change, no schema change, no new endpoint, no new computed value. The annotations
endpoint already serves the White-relative `Evaluation`, the winning chances and the severity for
every half-move, index-aligned with the navigation index.

**The real risk of this slice is layout, not logic**: "beside the board" in a component that stacks
everything vertically today, in a project with **no stylesheet at all** (US-13). Unit tests will not
see it — the Feature Path will.

## Acceptance criteria

- [ ] A curve is shown beside the board on the Analyse page for a Game that has been through an `Analysis pass`
- [ ] Each side's share of the height is its winning chances (White-relative), i.e. the same quantity the advantage bar shows — a position the bar shows as balanced is a median-split curve
- [ ] Raw centipawns are nowhere used as the drawn quantity, and no clamping constant is introduced
- [ ] A mate reads as a full area for the mating side
- [ ] Left edge is the starting Position (ply 0) at equality; the rightmost point is the Game's last `Move`
- [ ] One point per `Move` (half-move), uniformly spaced — a 40-full-move Game yields 80 points
- [ ] A single median reference line; no numeric axis, no gridlines, no tick labels
- [ ] The current `Move` is marked by a cursor, positioned at the board's current navigation index
- [ ] The cursor is at the left edge when the Game opens (the board's initial state is ply 0)
- [ ] The cursor follows stepping forward, stepping backward, and jumping straight to a `Move`
- [ ] Clicking or interacting with the curve does nothing — it is read-only
- [ ] The curve is carried by its own component, called by the board component
- [ ] The drawable shape is produced by a pure derivation, unit-tested without a DOM
- [ ] The curve is `aria-hidden`; no new `role`/`aria-label` is introduced anywhere in this slice
- [ ] No new live region and no new announcement on the Analyse page
- [ ] The current-move readout, the advantage bar, the move list, the game header and the flawed-square tint behave exactly as before
- [ ] With annotations absent (toggle off, or a Game not yet analyzed) no curve is rendered
- [ ] Toggling the annotations off does not make the layout jump — the board stays where it is and stays readable
- [ ] A Game not yet analyzed adds **no** new message: the existing "not yet analyzed" text and the "Analyser cette partie" action are the only ones
- [ ] After analysing the Game from the Analyse page, the curve appears with no manual reload
- [ ] The Explorer and "Positions dangereuses" are visually and behaviourally unchanged
- [ ] No server change, no schema change, no additional network call
- [ ] Existing component tests of the board still pass — or, where they conflict, the component is renamed/tidied rather than worked around (latitude granted by the requester)

### Feature Path (FP)

1. The Player opens a Game that has already been analysed → a curve is visible **beside** the board, its area starting from an equal split at the left edge.
2. The Player steps forward several `Move`s → the current-move cursor moves rightward, in step with the `Move` shown on the board.
3. The Player jumps straight to a late `Move` in the move list → the cursor lands at that same point, and the board shows that Position.
4. The Player steps back to the start → the cursor returns to the left edge.
5. The Player unchecks "Afficher les annotations" → the curve disappears along with the advantage bar and the per-`Move` values, and the board stays in place and readable.
6. The Player opens a Game that has **not** been analysed → no curve, and the page already explains why (the existing message and the "Analyser cette partie" action), with nothing said twice.

Verify: UI first. The `Evaluation`s the curve is drawn from are already served per half-move, so no backing-store probe is needed. Use the seeded fixture that inserts Games already marked analysed **with** their `evaluations` — no import, no engine run.

## Blocked by

None - can start immediately.
