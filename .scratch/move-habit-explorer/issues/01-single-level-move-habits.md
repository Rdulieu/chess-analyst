## Status
done — auto-merged into `integration/US-5-move-explorer`. Green local check: build + tests
(server 40, client 40) + agentic Feature Path green on the offline fixture (White e4 3×/50%,
Black d4/c4, side switch, Nc3 transposition merged into one entry), no blocking finding.

## Parent

`.scratch/move-habit-explorer/PRD.md`

## Integration branch

This sub-issue is implemented on the business-story integration branch
`integration/US-5-move-explorer` — branch from it and merge back into it, NOT `develop`.

## What to build

Add a `Move habit` explorer page (route `/explorer`, behind the client router from the
navigation-skeleton enabler — ADR-0006), reached for a chosen side (White or Black), showing the
candidate Moves played from the starting Position: each with its frequency, win rate (standard
scoring), and a breakdown of how many of those games fall into each time control category. US-5
adds the `/explorer` route and its navigation entry on top of the enabler's router.

Backing this:

- A new Drizzle table keyed by (Position FEN [**4-field**: placement, active colour, castling,
  en passant — the move counters dropped], the **side the player played**, Move) storing
  count/win/draw/loss and per-time-control sub-counts (ADR-0005).
- A `move_habits_computed` flag on the `games` table so a Game is counted **exactly once**
  (the pre-aggregated totals are not idempotent).
- A **standalone precomputation function** that walks a Game's Moves up to 40 Moves deep via
  `cm-chess` and updates these counters, recording **every** half-move (the player's own Moves
  **and** the opponent's replies) so the drill-down can later walk the whole line — merging
  Positions reached via different move orders (transpositions) into the same entry (by the
  4-field FEN), and skipping any Game already flagged. It is called from **both** entry points:
  the real chess.com import path (`importMonth`, per inserted Game) **and** the fixture-seed
  path — same function, never inlined or duplicated.
- A read API endpoint the UI calls for a given Position + side.

Seed a `Move habit` **fixture dataset** (distinct from US-1's single fixture Game): several short
games sharing early Moves, played as both White and Black, including at least one deliberate
transposition (same Position reached via different move orders) to prove the merge rule. The
fixture is the substrate for this issue's Feature Path (offline, deterministic); the explorer
also works on real imported Games via the same precomputation wired into `importMonth`. No
drill-down yet — this slice only shows the single top level, from the starting Position.

## Acceptance criteria

- [ ] The explorer is a page at `/explorer` with a side selector (White/Black) — the **side the player played** — that changes which candidates are shown (the explorer aggregates only that side's Games)
- [ ] Candidate Moves from the starting Position are listed with frequency, win rate, and per-time-control-category breakdown
- [ ] The two fixture games that transpose into the same Position are merged into a single counted entry, not two
- [ ] No candidate is hidden or filtered out for having a low sample size — the exact count is always shown alongside the rate
- [ ] The precomputation function stops walking a Game past 40 Moves (20 full moves) of depth
- [ ] The precomputation function is a standalone, callable unit invoked from **both** the real import path (`importMonth`) and the fixture-seed path — not embedded inline in either
- [ ] Each Game carries a `move_habits_computed` flag; calling the precomputation twice on the same Game does not double-count into the totals
- [ ] No per-run scope selector is added — the explorer aggregates over the whole imported history

### Feature Path (FP)

1. Launch the app seeded with the `Move habit` fixture dataset (offline, no network) → open the explorer page for a chosen side.
2. Look at the candidate Moves shown from the starting Position → the frequency, win rate, and per-cadence breakdown match what the fixture dataset should produce, and the transposed game counts as one merged entry.

Verify: UI first — open the explorer and read the candidates list. Probe the database directly only if the UI can't establish that the merge happened correctly.

## Blocked by

- `.scratch/nav-skeleton/issues/01-routed-app-pages-and-nav.md` (navigation-skeleton enabler) — the explorer is a routed page (`/explorer`) and needs the router + reusable `Board` from that enabler present. The enabler lands on `develop`; make sure `integration/US-5-move-explorer` is resynced on `develop` before starting here.
