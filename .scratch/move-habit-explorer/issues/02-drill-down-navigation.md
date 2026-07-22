## Status
ready-for-agent

## Parent

`.scratch/move-habit-explorer/PRD.md`

## Integration branch

This sub-issue is implemented on the business-story integration branch
`integration/US-5-move-explorer` — branch from it and merge back into it, NOT `develop`.

## What to build

Add level-by-level navigation to the explorer: selecting a candidate Move from the list descends
into the Position that results from it, replacing the displayed candidates with those played
from the new Position within the player's Games of the selected side — i.e. the Moves of
**whoever is now to move**: the player's own Moves (`Move habit`s) at the player's turn, the
opponent's replies (`Opponent reply`) at the opponent's turn, each with a player-relative win
rate — and a breadcrumb shows the path of Moves taken so far. Selecting an earlier point in the breadcrumb navigates back up to that level. Descending
stops being offered once 40 Moves (20 full moves) of depth is reached, matching the
precomputation's own depth cap from the previous issue.

## Acceptance criteria

- [ ] Selecting a candidate Move from the list shows the candidates played from the resulting Position
- [ ] The breadcrumb reflects the full sequence of Moves selected so far
- [ ] Selecting an earlier entry in the breadcrumb returns to that level, discarding deeper navigation
- [ ] No further descent is offered once the 40-Move depth cap is reached

### Feature Path (FP)

1. From the initial candidates, select a Move in the list → the explorer shows the candidates played from the resulting Position, and the breadcrumb reflects that one Move.
2. Select the breadcrumb's earlier entry → the explorer returns to the initial candidates.

Verify: UI first — drive the list and breadcrumb and read what's displayed at each step.

## Blocked by

- `.scratch/move-habit-explorer/issues/01-single-level-move-habits.md`
