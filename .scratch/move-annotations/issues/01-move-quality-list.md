Status: done — auto-merged into `integration/US-7-mistake-annotations-on-analysis` (PR #9).
Green local check: build + 97 server tests + 77 client tests. Feature Path verified against the
`seed:danger` fixture (direct API check + manual browser confirmation — no Chrome extension
available this session). One bug found and fixed during FP verification: `whiteEval` leaked the
raw `evaluations` row shape (`gameId`, `ply`) instead of a clean `{cp, mate}` pair for White-to-move
plies (regression test added).

## Parent

`.scratch/move-annotations/PRD.md` (US-7 — BACKLOG.md).

Implemented on the business-story integration branch
`integration/US-7-mistake-annotations-on-analysis` (already pushed) — branch sub-work from it and
merge back into it via PR, **not** `develop`. Auto-merges into this integration branch once the
local check (build + tests + this issue's Feature Path) is green.

## What to build

Surface US-4's stored per-ply `Evaluation`s directly on the Analyse page's move list, with zero
engine re-run:

- **Server**: factor the per-Game derivation currently private to the `Danger position` repository
  (walking a Game's stored `evaluations` into per-ply Positions/winning-chances, then into
  per-Move severities) out into a **neutral module** shared by `/danger` and this feature —
  `/danger`'s behaviour must be unchanged after the extraction (regression, not a rewrite). Extend
  that shared derivation with a **White-relative conversion**: the stored `cp`/`mate` is
  side-to-move-relative (UCI convention — CONTEXT.md's `Evaluation` entry documents this); convert
  by negating `cp`/`mate` when Black is to move (even ply index = White to move, odd = Black),
  and mirror the rule for winning chances (`100 - chances` when Black to move).
- **New endpoint**: a per-Game annotations read (e.g. `GET /api/games/:id/annotations`) returning
  one entry per ply, **index-aligned with ply 0 = the starting Position** (matching the client's
  own navigation index — no off-by-one), each carrying: the White-relative `Evaluation`
  (`{ cp: number|null, mate: number|null }`, same nullable-pair shape as the stored `Evaluation`),
  the White-relative winning chances (0–100), and the Move severity
  (`"inaccuracy"|"mistake"|"blunder"|null`) — `null` for ply 0, for the opponent's Moves, and for
  unflagged Player Moves. For a Game whose `analyzed` flag is false, return an explicit
  not-yet-analyzed result, not a silent empty array (an empty array must mean "analyzed, no
  mistakes found", never "not analyzed").
- **Client**: on the Analyse page, when the loaded Game is analyzed, fetch these annotations once
  and render, in the existing move list, for every half-move:
  - the Player's own flawed Moves get their severity glyph (`?!`/`?`/`??`) — never the opponent's;
  - every half-move (both sides) gets its formatted `Evaluation` next to it, in pawns with one
    decimal (`+1.3` / `-0.7`), or `M3` / `-M2` for a forced mate — this formatting (sign, rounding,
    `M` prefix) is client-side presentation over the numeric value the server returns, not a
    server responsibility.
  - a single toggle (local component state, boolean, defaulting to `true`, not persisted anywhere)
    shows/hides this whole package; when off, the move list renders exactly as it does today.

## Acceptance criteria

- [ ] The shared derivation module is used by both `/danger` and the new endpoint; no duplicated
      copy of the per-ply/per-Move derivation logic remains.
- [ ] `/danger`'s existing tests pass unmodified after the extraction (behaviour-preserving
      refactor).
- [ ] The new endpoint's per-ply array has one entry per Position (ply 0 = start), index-aligned
      with no off-by-one.
- [ ] `Evaluation`s returned are White-relative (verified against a hand-checked fixture Game with
      Moves by both sides).
- [ ] Severity is `null` for ply 0, for every opponent half-move, and for the Player's own Moves
      that drop winning chances by less than 10%.
- [ ] Severity matches `Inaccuracy` (10–20% drop) / `Mistake` (20–30%) / `Blunder` (30%+) exactly
      as `/danger` already classifies the same Moves — no divergence between the two views for the
      same Game.
- [ ] Requesting annotations for a not-yet-analyzed Game returns an explicit not-analyzed result,
      distinguishable from "analyzed, zero mistakes."
- [ ] A forced mate is classified/formatted sensibly (no arbitrary centipawn encoding), on the
      server's derivation and on the client's `M3`/`-M2` display.
- [ ] The Analyse page's move list shows `?!`/`?`/`??` only next to the Player's own flawed Moves.
- [ ] The move list shows a formatted `Evaluation` next to every half-move, both sides.
- [ ] The toggle is on by default, and toggling it off hides every glyph and `Evaluation` added by
      this issue (the page renders as it did before this issue when off).
- [ ] The toggle's state is not remembered across a page reload.
- [ ] No visible change to `/danger`, `/openings`, `/stats`, or the Move habit explorer.

### Feature Path (FP)

1. Open Analyse for an already-analyzed fixture Game → the move list shows `?!`, `?`, or `??` next
   to the Player's own flawed Moves only (never next to an opponent Move), and a formatted
   `Evaluation` (e.g. `+1.3`, `-0.7`, or `M2`) next to every Move on both sides, matching known
   fixture values.
2. Toggle the annotations off → every glyph and `Evaluation` disappears from the move list.
3. Toggle back on → they reappear, matching step 1.

Verify: UI first (the rendered move list). No backing-store probe needed — the fixture's known
values are checked through what's rendered.

## Blocked by

None — can start immediately.
