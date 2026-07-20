## Status
ready-for-agent

## Parent

`.scratch/move-habit-explorer/PRD.md`

## Integration branch

This sub-issue is implemented on the business-story integration branch
`integration/US-5-move-explorer` — branch from it and merge back into it, NOT `develop`.

## What to build

Render the currently displayed candidate Moves directly on the interactive board (US-1's
`react-chessboard` instance) as arrows, with thickness encoding frequency (more played =
thicker) and color encoding win rate (per the 50% threshold already used for `Weak opening`).
Clicking an arrow descends a level exactly as clicking the corresponding list entry would (same
navigation/breadcrumb behavior as the previous issue).

## Acceptance criteria

- [ ] Every candidate Move currently shown in the list also appears as an arrow on the board
- [ ] Arrow thickness visibly differs between a frequently played candidate and a rarely played one
- [ ] Arrow color visibly differs between a candidate with a win rate at/above 50% and one below it
- [ ] Clicking an arrow produces the same descend + breadcrumb update as clicking its corresponding list entry

### Feature Path (FP)

1. On the explorer, observe the arrows drawn on the board → they match the candidates listed, with visibly different thickness/color reflecting frequency/win rate.
2. Click one of the arrows → the explorer descends into that Move exactly as the list would have, and the breadcrumb updates accordingly.

Verify: UI first — read the board's arrows and drive a click on one of them.

## Blocked by

- `.scratch/move-habit-explorer/issues/02-drill-down-navigation.md`
