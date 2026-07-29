Status: ready-for-agent

## Parent

`.scratch/move-annotations/PRD.md` (US-7 — BACKLOG.md).

Implemented on the business-story integration branch
`integration/US-7-mistake-annotations-on-analysis` — branch from it and merge back into it via PR,
**not** `develop`. Auto-merges into this integration branch once the local check (build + tests +
this issue's Feature Path) is green.

## What to build

Extend the Analyse page's board area (no new server endpoint — reuses issue 01's per-ply
annotations and its toggle) with a visual readout for the **currently-viewed Position**:

- A **White/Black winning-chances balance bar**: a small presentational component whose fill is
  driven by the current index's White-relative winning chances (0–100) from issue 01's
  annotations — not raw centipawns, so it saturates consistently with how severities are already
  classified.
- The existing "current move" status line gains the current index's formatted `Evaluation`
  (same formatting convention as issue 01: pawns/one decimal, or `M`-notation for mate).
- **Board highlight**: expose the destination square of each half-move from the board's PGN
  parsing (currently only exposes the move's notation and resulting Position — add the
  destination square, already available from the underlying rule-engine's move data). When the
  currently-viewed Position follows one of the Player's own flawed Moves, tint that destination
  square inline (per-square style, the same "inline style, not a stylesheet" mechanism the app
  already uses elsewhere — no CSS class), with a **distinct tint per severity**. The move list's
  glyph from issue 01 remains the accessible, color-independent source of truth — the board tint
  is a supplementary visual, not the only signal.
- All three (bar, readout, highlight) follow issue 01's toggle: hidden together when it's off.
- Both the bar/readout and the highlight update on every navigation (Previous/Next, or jumping via
  the move list).

## Acceptance criteria

- [ ] The balance bar's proportions are driven by White-relative winning chances (0–100), not raw
      centipawns.
- [ ] The bar and the numeric readout update immediately when navigating (Previous, Next, and
      jump-to-move via the list) to match the newly-current Position.
- [ ] When the current Position follows one of the Player's own flawed Moves, that Move's
      destination square is tinted; the tint differs visibly between `Inaccuracy`, `Mistake`, and
      `Blunder`.
- [ ] When the current Position follows a clean Player Move, an opponent Move, or is the starting
      Position, no square is tinted.
- [ ] The board highlight is never the sole indicator of a flaw — the move list's glyph (issue 01)
      is present whenever the highlight is.
- [ ] Turning issue 01's toggle off also hides the bar, the readout, and the board highlight;
      turning it back on restores all of them.
- [ ] No other page (`/danger`, `/openings`, `/stats`, Move habit explorer) is affected — the
      board component touched here is only ever rendered by the Analyse page.

### Feature Path (FP)

1. With annotations on, open Analyse for an already-analyzed fixture Game and step to the Position
   right after one of the Player's own flawed Moves → the board's destination square is tinted,
   the balance bar and the numeric readout next to the board match that ply's entry from issue
   01's move list.
2. Step to a Position following a clean Move or an opponent Move → the square tint disappears; the
   bar and readout still update to match the new Position.
3. Toggle annotations off → the bar, readout, and any tint disappear; toggle back on → they return.

Verify: UI first (the rendered board and readout). No backing-store probe needed.

## Blocked by

- Issue 01 (Move quality + Evaluation annotations on the move list) — needs its endpoint and
  toggle.
