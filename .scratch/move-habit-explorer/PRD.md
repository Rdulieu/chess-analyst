# Move habit explorer

Status: ready-for-agent
Business ref: BACKLOG.md — US-5

## Problem Statement

The player wants to understand their own habits — which moves they tend to play from a given
position, and how well those choices have actually worked out — but there's currently no way to
see this beyond browsing one game at a time (US-1's skeleton only shows a single fixture Game).
Nothing surfaces patterns across the whole history.

## Solution

A drill-down move explorer, built on top of US-1's skeleton (frontend, local server,
SQLite/Drizzle, interactive board), that lets the player navigate level by level through the
Moves they've actually played, starting from any recurring Position — merged across Games by
transposition, up to 20 full moves (40 Moves) deep — for a given side. At each level, the
candidate Moves are shown both as a list (frequency, win rate, per-time-control breakdown) and
as arrows directly on the interactive board (thickness = frequency, color = win rate); clicking
either descends one level, with a breadcrumb to navigate back up. `Move habit` statistics are
precomputed incrementally as each Game enters the database (ADR-0005), so browsing stays fast
regardless of history size. This US uses its own small fixture dataset — not chess.com import,
which is US-2's job — to prove the mechanism end-to-end independently.

## User Stories

1. As a player, I want to open a Move habit explorer for a given side (White or Black), so that I can see my own habits separately for each color.
2. As a player, I want to see, from the starting position, which first Moves I've played and how often, so that I can see my opening habits at a glance.
3. As a player, I want to see the win rate of each candidate Move, so that I can tell which habits have worked out and which haven't.
4. As a player, I want to see, for each candidate Move, how many of those games came from each time control category, so that I can judge whether a habit reflects considered play or rushed bullet decisions.
5. As a player, I want Positions reached via different move orders to be merged together, so that transpositions don't artificially split my habits into separate, smaller samples.
6. As a player, I want to click a Move in the list to descend into it, so that I can explore my habits deeper into a specific line.
7. As a player, I want a breadcrumb showing the path I've taken, so that I can tell where I am and navigate back up.
8. As a player, I want the candidate Moves also shown as arrows directly on the interactive board, so that I can read my habits visually without leaving the board.
9. As a player, I want the arrow's thickness to reflect how often I've played that Move, so that the most common habits stand out immediately.
10. As a player, I want the arrow's color to reflect the win rate of that Move, so that risky habits stand out immediately.
11. As a player, I want clicking an arrow on the board to descend a level, exactly like clicking the corresponding list entry, so that I have two equivalent ways to navigate.
12. As a player, I want the explorer to stop at 20 full moves (40 Moves) of depth, so that I'm not shown noise from positions that only ever occur once.
13. As a player, I want to see the exact count behind every frequency/rate shown, so that I can judge for myself whether a small sample is meaningful, since no minimum sample size is enforced.
14. As a player, I want this feature to work against a small set of fixture Games (including one deliberate transposition) rather than needing chess.com import, so that it can be built and demoed independently of US-2.
15. As a developer picking up US-2 later, I want the precomputation hook to be a well-defined function that runs whenever a Game enters the database, so that wiring in real chess.com import later just means calling it from a different entry point, not rewriting the aggregation logic.

## Implementation Decisions

- Builds on top of US-1's skeleton: reuses the same React frontend, local Node server, SQLite via Drizzle (ADR-0002/0003), and the interactive board (`react-chessboard` + `cm-chess`, ADR-0004).
- **New fixture dataset** (distinct from US-1's single fixture Game): a small set of fixture Games deliberately crafted to include shared early Moves across multiple games (to produce real frequency counts), at least one genuine transposition (same Position reached via different move orders, to verify the merge-by-FEN rule), and games played as both White and Black.
- **Precomputation** (ADR-0005): a function walks a Game's Moves up to 40 Moves (20 full moves) deep via `cm-chess`, and for each (Position FEN, side, Move played) updates stored counters: total count, win/draw/loss counts (for standard-scoring win rate), and per-time-control-category sub-counts. This function is called once per Game as it enters the database — for this US, from the fixture-seeding step; US-2 will later call the same function from the real import path instead of duplicating this logic.
- **Schema** (Drizzle/SQLite): a table keyed by (Position FEN, side, Move) storing the counters above — distinct from the `games` table introduced in US-1.
- **API**: a read endpoint returning, for a given Position (FEN) and side, the candidate Moves with their counters. The drill-down UI calls this each time it descends a level rather than recomputing anything itself.
- **UI**: a drill-down component with a breadcrumb, rendering candidates as both a list and board arrows (thickness/color) via `react-chessboard`'s arrow support; both the list and the arrows trigger the same "descend" action.

## Testing Decisions

Tests assert observable behavior (stored counters, API responses, what's rendered/navigable) — not internals of Drizzle, `cm-chess`, or `react-chessboard`.

- **Precomputation function**: tested directly against a real (test) SQLite database — feed it the fixture Games, assert the resulting counters, including that the deliberate transposition case merges correctly into a single Position entry.
- **API**: the read endpoint tested in integration against a running server + a seeded test database, asserting candidate Moves/counters for a known fixture Position.
- **Drill-down component**: tested in isolation with fixture data — simulate selecting a list entry and clicking a board arrow, assert both descend identically and the breadcrumb updates; assert the explorer stops offering further depth past 40 Moves.
- **Feature Path (agentic, apex)**: a subagent launches the app (seeded with the fixture dataset), opens the explorer for a side, reads the candidate Moves/frequencies/rates, descends one level via the list, then descends again via a board arrow, and confirms the breadcrumb reflects the path taken.
- No Happy Path promotion yet — consistent with US-1, this remains part of the app's early buildout. HP candidates should be reconsidered once real import (US-2) supplies genuine data volume.

## Out of Scope

- Chess.com import (US-2) — this US uses its own fixture dataset instead.
- `Weak opening` statistics (US-3) and `Danger position`/Stockfish analysis (US-4) — unrelated features.
- A full tree-diagram visualization (rejected in favor of drill-down navigation).
- Any depth beyond 20 full moves (40 Moves).
- Splitting the tree or win rate by time control (explicitly rejected — only a count breakdown per cadence is shown, not separate trees).

## Further Notes

The fixture dataset's deliberate transposition case is the key regression check for the
merge-by-FEN rule — worth keeping as a named, documented fixture rather than an incidental one.
Once US-2 lands, its import path should call the same precomputation function rather than
duplicating the aggregation logic.
