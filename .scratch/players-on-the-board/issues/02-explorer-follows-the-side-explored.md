Status: ready-for-agent

## Parent

`.scratch/players-on-the-board/PRD.md` (US-10a — BACKLOG.md).

Implemented on the business-story integration branch
`integration/US-10a-players-on-the-board` — branch sub-work from it and merge back into it via
PR, **not** `develop`. Auto-merges once the local check (build + tests + this issue's Feature
Path) is green.

## What to build

The Explorer already knows which side it is exploring — it has a White/Black selector — and still
draws every position from White's point of view. A Player exploring their Black repertoire gets
their own candidate moves drawn as arrows pointing the wrong way.

- The board is **oriented to the side being explored**, using the board orientation property
  introduced by issue 01. The **existing selector becomes the orientation control**: no new
  control is added (the project has no stylesheet — see US-13).
- The orientation is **held constant down the whole line**. It must **not** flip when an
  `Opponent reply` has the move; the Player is walking their own repertoire, not alternating
  points of view.
- The position's **side to move** is stated in text, using the standalone function from issue 01.
  It is what tells the Player whether the listed candidates are their own `Move habit`s or the
  `Opponent reply`s — a distinction the level's own heading does not currently make explicit.

## Acceptance criteria

- [ ] Exploring as Black renders the board with Black at the bottom.
- [ ] Exploring as White renders the board with White at the bottom.
- [ ] Switching side flips the board, with no control other than the existing selector.
- [ ] Drilling down to a level where the opponent has the move does **not** flip the board.
- [ ] Returning up the breadcrumb does not flip the board either.
- [ ] The side to move is stated in text and is correct at every level of the drill-down.
- [ ] The candidate arrows stay consistent with the orientation shown.

### Feature Path (FP)

1. Open the Explorer as **White** → the board shows White at the bottom, and the side to move
   reads White.
2. Switch to **Black** → the board flips; no extra control appeared to do it.
3. Drill down one move → the opponent now has the move, the text says so, and **the board has
   not flipped**.
4. Drill one level further, then walk back up the breadcrumb → the orientation never moved.
5. Check the candidate arrows at a Black-oriented level → they point the way the Player plays.

Verify: UI first.

## Blocked by

Issue 01 — it introduces the board's orientation property and the side-to-move function.
