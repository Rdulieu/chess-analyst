## Status
ready-for-agent

## Parent

`.scratch/move-habit-explorer/PRD.md`

## Integration branch

This sub-issue is implemented on the business-story integration branch
`integration/US-5-move-explorer` — branch from it and merge back into it, NOT `develop`.

## What to build

Add a `Move habit` explorer view, reached for a chosen side (White or Black), showing the
candidate Moves played from the starting Position: each with its frequency, win rate (standard
scoring), and a breakdown of how many of those games fall into each time control category.
Backing this: a new Drizzle table keyed by (Position FEN, side, Move) storing count/win/draw/loss
and per-time-control sub-counts (ADR-0005), a precomputation function that walks a Game's Moves
up to 40 Moves deep via `cm-chess` and updates these counters — merging Positions reached via
different move orders (transpositions) into the same entry — and a read API endpoint the UI
calls for a given Position+side. Seed a new fixture dataset for this feature (distinct from
US-1's single fixture Game): several short games sharing early Moves, played as both White and
Black, including at least one deliberate transposition (same Position reached via different
move orders) to prove the merge rule. No drill-down yet — this slice only shows the single top
level, from the starting Position.

## Acceptance criteria

- [ ] A side selector (White/Black) is available and changes which candidates are shown
- [ ] Candidate Moves from the starting Position are listed with frequency, win rate, and per-time-control-category breakdown
- [ ] The two fixture games that transpose into the same Position are merged into a single counted entry, not two
- [ ] No candidate is hidden or filtered out for having a low sample size — the exact count is always shown alongside the rate
- [ ] The precomputation function stops walking a Game past 40 Moves (20 full moves) of depth
- [ ] The precomputation function is a standalone, callable unit — not embedded inline in the fixture-seeding script — so US-2 can later call it from the real import path without rewriting it

### Feature Path (FP)

1. Launch the app seeded with the Move habit fixture dataset → open the explorer for a chosen side.
2. Look at the candidate Moves shown from the starting Position → the frequency, win rate, and per-cadence breakdown match what the fixture dataset should produce, and the transposed game counts as one merged entry.

Verify: UI first — open the explorer and read the candidates list. Probe the database directly only if the UI can't establish that the merge happened correctly.

## Blocked by

- `.scratch/app-skeleton/issues/01-boot-skeleton-fixture-board.md` (US-1) — this issue needs that work present on this branch. Since `integration/US-5-move-explorer` was created from `integration/US-1-chess-history-analysis` before that issue was implemented, make sure its changes are merged/rebased in before starting here.
