## Status
ready-for-agent

## Parent

`.scratch/app-skeleton/PRD.md`

## What to build

Add the ability to jump directly to any Move in the fixture Game without stepping through every
intermediate Move — e.g. a move list next to the board where selecting an entry takes the board
straight to the position after that Move, reusing the same `cm-chess`-backed position
computation as the forward/backward navigation (ADR-0004). Forward/backward navigation must
continue to work correctly from a jumped-to position.

## Acceptance criteria

- [ ] Selecting any Move in the fixture Game's history immediately shows the position right after that Move, without requiring intermediate steps
- [ ] After jumping, stepping forward or backward continues to behave correctly from that point
- [ ] Castling, en passant, and promotion still resolve correctly when jumped to directly (not just when reached by stepping)

### Feature Path (FP)

1. From the fixture Game, pick a specific Move from the middle of the game and go directly to it → the board immediately shows the position after that Move, without passing through every intermediate Move.
2. From that jumped-to position, step forward once more → the board correctly continues from there.

Verify: UI first — select a mid-game Move directly and read the resulting position, then use the forward control once more.

## Blocked by

- 02-forward-backward-navigation
