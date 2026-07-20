## Status
ready-for-agent

## Parent

`.scratch/app-skeleton/PRD.md`

## What to build

Add move-by-move navigation through the fixture Game: forward and backward controls that step
through its Moves one at a time, using `cm-chess`'s parsed move history to compute each
resulting position and updating `react-chessboard` accordingly (ADR-0004). Display each Move's
standard notation (e.g. e4, Nf3) alongside the board as navigation happens. Castling, en
passant, and promotion must resolve to the correct position at every step — this comes for free
from `cm-chess`'s rule engine as long as navigation is built on top of its move history rather
than reimplementing position computation.

## Acceptance criteria

- [ ] A forward control advances the board by exactly one Move at a time
- [ ] A backward control reverts the board by exactly one Move at a time
- [ ] The board cannot advance past the last Move or revert before the starting position
- [ ] Each Move's standard notation is displayed alongside the board as it's reached
- [ ] Positions involving castling, en passant, or promotion (in the fixture Game, or a second fixture chosen to cover these if the first doesn't include them) render correctly at every step

### Feature Path (FP)

1. From the fixture Game's starting position, advance through several Moves one at a time → each time, the board updates to the correct resulting position and that Move's notation is shown.
2. Step back through the same Moves → each time, the board reverts to the correct prior position.

Verify: UI first — drive the board's controls and read the displayed position/notation at each step.

## Blocked by

- 01-boot-skeleton-fixture-board
