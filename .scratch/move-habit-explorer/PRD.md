# Move habit explorer

Status: ready-for-agent
Business ref: BACKLOG.md — US-5
Decisions: `docs/adr/0005-precomputed-move-habit-stats.md`, `docs/adr/0006-client-routing-page-per-journey.md`

> Re-grilled after US-2 (chess.com import) landed on `develop`. The explorer now runs on the
> Player's **real imported Games**, not a throwaway fixture dataset; the fixture survives only as
> the deterministic substrate for the sub-issues' Feature Paths. See "Implementation Decisions".

## Problem Statement

The player wants to understand their own habits — which moves they tend to play from a given
position, and how well those choices have actually worked out — but there's currently no way to
see this beyond browsing one game at a time. Nothing surfaces patterns across the whole history.

## Solution

A drill-down move explorer, on its own page (`/explorer`, behind the client router — ADR-0006),
that lets the player, for a chosen side they played (White or Black), walk **level by level down
a whole line** of their imported Games — starting from the initial Position and merged across
Games by transposition, up to 20 full moves (40 Moves) deep. The drill-down **alternates**: at
the player's turn it shows the player's own Moves (`Move habit`s), at the opponent's turn it
shows the opponent's replies (`Opponent reply`) — both with a **player-relative** win rate, so
the player sees both which of their habits work and which opponent replies give them trouble. At
each level, the candidate Moves are shown both as a list (frequency, win rate, per-time-control
breakdown) and as arrows directly on the interactive board (hue = win rate, opacity =
frequency); clicking either descends one level, with a breadcrumb to navigate back up. `Move habit` statistics are
precomputed incrementally as each Game enters the database (ADR-0005), so browsing stays fast
regardless of history size. The explorer runs over the **whole** imported history — there is no
per-run scope selector — precisely because a single global precomputed aggregate answers the
read directly.

## User Stories

1. As a player, I want to open a Move habit explorer for a given side (White or Black), so that I can see my own habits separately for each color.
2. As a player, I want to see, from the starting position, which first Moves I've played and how often, so that I can see my opening habits at a glance.
3. As a player, I want to see the win rate of each candidate Move, so that I can tell which habits have worked out and which haven't.
4. As a player, I want to see, for each candidate Move, how many of those games came from each time control category, so that I can judge whether a habit reflects considered play or rushed bullet decisions.
5. As a player, I want Positions reached via different move orders to be merged together, so that transpositions don't artificially split my habits into separate, smaller samples.
6. As a player, I want to click a Move in the list to descend into it, so that I can explore my habits deeper into a specific line.
7. As a player, I want a breadcrumb showing the path I've taken, so that I can tell where I am and navigate back up.
8. As a player, I want the candidate Moves also shown as arrows directly on the interactive board, so that I can read my habits visually without leaving the board.
9. As a player, I want the arrow's opacity to reflect how often a Move was played, so that the most common Moves stand out immediately.
10. As a player, I want the arrow's color to reflect the win rate of that Move, so that risky habits stand out immediately.
11. As a player, I want clicking an arrow on the board to descend a level, exactly like clicking the corresponding list entry, so that I have two equivalent ways to navigate.
12. As a player, I want the explorer to stop at 20 full moves (40 Moves) of depth, so that I'm not shown noise from positions that only ever occur once.
13. As a player, I want to see the exact count behind every frequency/rate shown, so that I can judge for myself whether a small sample is meaningful, since no minimum sample size is enforced.
14. As a player, I want the explorer to reflect my **actual imported history**, so that the habits shown are really mine and not a demo dataset.
15. As a developer, I want the precomputation to be a standalone function invoked at **every** point a Game enters the database — the real chess.com import path AND the fixture-seed path — so that the aggregation logic is written once and each entry point just calls it.
16. As a developer, I want each Game to carry a flag marking that its Move habit counters have been computed, so that re-processing a Game already counted cannot double-count into the pre-aggregated totals.
17. As a player, I want to see, at the opponent's turn, which replies my opponents have played and my win rate against each, so that I can spot which of their responses give me trouble.

## Implementation Decisions

- **Runs on real imported Games**: the explorer reads the precomputed `Move habit` aggregate built from the Player's imported Games (US-2's `games` table). The earlier "independent, own-fixture-at-runtime" framing is dropped now that import exists.
- **Precomputation is a standalone function with two entry points** (ADR-0005): one function walks a Game's Moves up to 40 Moves (20 full moves) deep via `cm-chess` and updates the stored counters. It is called (a) from the **real import path** (`importMonth`, per Game inserted) and (b) from the **fixture-seed path** used by the sub-issues' Feature Paths. Same logic, two callers — never inlined or duplicated.
- **Global pre-aggregated counters** keyed by (Position FEN — the **4-field** form: placement, active colour, castling, en passant, dropping the move counters — the **side the player played**, and the Move): total count, win/draw/loss counts (player-relative, for standard-scoring win rate), and per-time-control-category sub-counts. **Every** half-move up to the depth cap is recorded — the player's own Moves and the opponent's replies alike — so the drill-down can walk a whole line; whether a level shows `Move habit`s or `Opponent reply`s follows from the Position's side to move versus the player's side. Reading the explorer is a lookup, not a scan. (Merge key rationale: ADR-0005.)
- **Per-Game idempotency flag** (ADR-0005): each `games` row carries a `move_habits_computed` flag; the precomputation skips a Game already flagged and sets it once done, so a Game is counted exactly once regardless of entry point (the pre-aggregated totals are not naturally idempotent).
- **No backfill**: Games imported before this feature carry no counters and are not retro-computed; refreshing means wiping the local database and re-importing (a plain re-import is deduped-away and would not re-trigger the hook). Consistent with the local, single-user, throwaway-data tool (ADR-0002).
- **Schema** (Drizzle/SQLite): a table keyed by (Position FEN [4-field], side played, Move) storing the counters above — distinct from the `games` table — plus the `move_habits_computed` flag on `games`.
- **API**: a read endpoint returning, for a given Position (FEN) and side, the candidate Moves with their counters. The drill-down UI calls this each time it descends a level rather than recomputing anything itself.
- **UI on its own page** (`/explorer`, ADR-0006): a drill-down component with a breadcrumb, rendering candidates as both a list and board arrows via `react-chessboard`'s arrow support. Arrow **hue** encodes win rate and **opacity** encodes frequency — `react-chessboard` v5 supports per-arrow colour only (not per-arrow thickness), so frequency rides on the colour's alpha rather than stroke width. Both list and arrow trigger the same "descend" action. US-5 adds the `/explorer` route and its nav entry (the navigation skeleton itself is delivered by the separate enabler, which US-5 depends on).

## Testing Decisions

Tests assert observable behavior (stored counters, API responses, what's rendered/navigable) — not internals of Drizzle, `cm-chess`, or `react-chessboard`.

- **Precomputation function**: tested directly against a real (test) SQLite database — feed it fixture Games, assert the resulting counters, including that the deliberate transposition case merges into a single Position entry, and that the `move_habits_computed` flag prevents double counting on a second call.
- **API**: the read endpoint tested in integration against a running server + a seeded test database, asserting candidate Moves/counters for a known fixture Position.
- **Drill-down component**: tested in isolation with fixture data — simulate selecting a list entry and clicking a board arrow, assert both descend identically and the breadcrumb updates; assert the explorer stops offering further depth past 40 Moves.
- **Feature Path (agentic, apex) — on the fixture dataset**: the sub-issues' FPs run against the app seeded with the deterministic `Move habit` fixture (offline, no network), so exact frequencies/rates and the transposition merge can be asserted. This is the sub-issue → integration auto-merge gate.
- **Happy Path (agentic) — on real chess.com data**: US-5 gets a dedicated **HP-02** (`docs/test-scenarios/`), run at the `integration → develop` decision, that imports a real month (reference account `DudulSmash`, 2026/06) and exercises the explorer end to end on genuine data. This reverses the earlier "no HP yet" note now that real import supplies data volume. Budget: 2/3 HP.

## Out of Scope

- `Weak opening` statistics (US-3) and `Danger position`/Stockfish analysis (US-4) — unrelated features.
- Global stats page content (US-6) — separate feature filling the `/stats` placeholder.
- The navigation skeleton / router itself — delivered by the technical enabler US (`.scratch/nav-skeleton/`), which this US depends on.
- A full tree-diagram visualization (rejected in favor of drill-down navigation).
- Any depth beyond 20 full moves (40 Moves).
- Any per-run scope selector (last-N Games, cadence filter) — explicitly rejected: the explorer runs over the whole imported history against the global precomputed aggregate.
- Splitting the tree or win rate by time control (only a count breakdown per cadence is shown, not separate trees).

## Further Notes

- The fixture dataset's deliberate transposition case is the key regression check for the merge-by-FEN rule — kept as a named, documented fixture. It is the **FP substrate**, no longer the runtime source.
- The precomputation is already wired into the real import path (US-2's `importMonth`) as part of this US — not deferred to "once US-2 lands".
- Depends on the navigation-skeleton enabler (`integration/nav-skeleton → develop`); US-5 resyncs on `develop` before building `/explorer`.
