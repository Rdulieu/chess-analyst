# Move habit statistics are precomputed incrementally during import, not computed on demand

`Move habit` (frequency and win rate per Move from a recurring Position, merged by transposition)
could either be computed on the fly each time the explorer is opened, by scanning the full game
history, or precomputed and updated incrementally as each Game is imported. We chose the
**incremental precomputation** approach: since `Import` is already incremental (ADR-0003) —
each Game is only ever processed once — the same pass updates the relevant `Move habit`
counters, rather than rescanning the whole history on every read.

## Considered options

- **On-the-fly computation**: simplest to implement (no extra storage, no update logic to keep in sync), but gets slower as the game history grows, since every explorer view would rescan potentially thousands of Games.
- **Incremental precomputation (chosen)**: `Move habit` counters (per Position reached, per Move played from it, per side) are updated once when a Game enters the database, alongside its Evaluations. Reading the explorer becomes a simple lookup instead of a full scan. The explorer runs over **all** imported Games (no per-run scope selector) — precisely because a single global aggregate answers the read directly.

## The precomputation is a standalone function, invoked at every entry point

The counter-update logic lives in **one standalone function**, not inlined into whichever code path happens to add a Game. It is called at **both** points where a Game enters the database:

- the real chess.com `Import` path (`importMonth`, US-2) — the data the HP suite exercises;
- the `Move habit` **fixture seeding** path — the deterministic data the sub-issues' Feature Paths exercise.

This keeps the aggregation logic identical across entry points and lets each feature be wired independently (see `[[feature-independent-functions]]` in the project memory) rather than duplicated.

## A per-Game flag guards against double counting

Because the stored structure is **pre-aggregated** (running totals per FEN/side/Move), re-running the precomputation over a Game it already counted would **double-count** — the aggregate is not naturally idempotent, unlike a per-event table would be. Each `games` row therefore carries a `move_habits_computed` flag: the precomputation skips a Game already flagged and sets it once done. A Game is counted **exactly once**, whichever entry point processed it.

## Consequences

Adds a real aggregate data structure (positions reached, keyed by FEN, with per-move counters) alongside the raw Game/PGN storage — not just derived, on-demand math. If the depth cap (20 full moves) or the transposition-merging rule (ADR context: `Move habit` in `CONTEXT.md`) ever changes, existing precomputed counters need a one-time recomputation pass, not just a code change.

**No backfill of pre-existing Games** is provided: Games imported before this feature existed carry no counters and are not retro-computed. Refreshing them means wiping the local SQLite database and re-importing from scratch — acceptable for a single-user, local, throwaway-data tool (ADR-0002). Note that a plain re-import over existing data is a no-op here: `Import` dedups by game URL, so an already-present Game is skipped and never re-enters the insertion path.
