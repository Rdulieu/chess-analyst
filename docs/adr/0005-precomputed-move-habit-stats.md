# Move habit statistics are precomputed incrementally during import, not computed on demand

`Move habit` (frequency and win rate per Move from a recurring Position, merged by transposition)
could either be computed on the fly each time the explorer is opened, by scanning the full game
history, or precomputed and updated incrementally as each Game is imported. We chose the
**incremental precomputation** approach: since `Import` is already incremental (ADR-0003) —
each Game is only ever processed once — the same pass updates the relevant `Move habit`
counters, rather than rescanning the whole history on every read.

## Considered options

- **On-the-fly computation**: simplest to implement (no extra storage, no update logic to keep in sync), but gets slower as the game history grows, since every explorer view would rescan potentially thousands of Games.
- **Incremental precomputation (chosen)**: `Move habit` counters (per Position reached, per Move played from it, per side) are updated once when a Game is imported, alongside its Evaluations. Reading the explorer becomes a simple lookup instead of a full scan.

## Consequences

Adds a real aggregate data structure (positions reached, keyed by FEN, with per-move counters) alongside the raw Game/PGN storage — not just derived, on-demand math. If the depth cap (20 full moves) or the transposition-merging rule (ADR context: `Move habit` in `CONTEXT.md`) ever changes, existing precomputed counters need a one-time recomputation pass, not just a code change.
