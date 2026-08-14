# Store raw per-ply Evaluations; derive move quality and Danger positions on the fly

US-4's analysis pass produces an engine `Evaluation` for **every position** of an analyzed Game
(evaluating each position is needed anyway: a player Move's quality compares the eval of *its*
position — best play — with the eval of the *next* position — the move actually played). We store
**only those raw Evaluations** — one per ply — and **derive everything else on the fly**:
`Inaccuracy`/`Mistake`/`Blunder` severities *and* `Danger position`s. We do **not** store computed
severities, and we do **not** precompute a Danger-position counter table.

Move quality follows **Lichess's method**: classify by the drop in **winning chances** (a
probability of winning derived from the `Evaluation`), not by a raw centipawn threshold — a
**10–20% / 20–30% / 30%+** drop is an `Inaccuracy` / `Mistake` / `Blunder` (see CONTEXT.md). Only the
player's own Moves are classified. **Mate** falls out naturally: a mate maps to ~100% win chance
(or ~0% when getting mated), so the drop stays bounded in [0,100%] — no arbitrary centipawn
encoding. A `Danger position` (4-field FEN, transpositions merged; not scoped by cadence or side)
counts a **serious error** (`Mistake` or `Blunder`, ≥20% drop) occurring within the following **10
half-moves** of a reach; its two figures (reach count, error proportion) are computed by scanning
the stored per-ply Evaluations at read time.

## Considered options

- **Store per-Move severity (denormalized).** Simpler reads, but **bakes the thresholds** into the
  data: changing the 10/20/30% bands or the cp→win% curve would need a re-run or a migration.
  Rejected — raw Evaluations let us re-derive with **no engine re-run**, honouring the Import
  glossary term (*"Evaluations are retained and never recomputed"*).
- **Precompute a `danger_positions` counter table** (like `Move habit`, ADR-0005). Fast lookups,
  but **bakes the 10-half-move window and the severity umbrella** into the table, and needs the
  double-count guard. The window is explicitly meant to be **tunable**. Rejected — the aggregate is
  cheap to derive on read (~4k plies × a 10-ply look-ahead), mirroring `/stats` and `/openings`.
- **Store raw per-ply Evaluations, derive severity + Danger on the fly (chosen).** One artifact
  (the expensive engine output), everything else derived; maximal flexibility, single source of
  truth.

## Consequences

- **Schema**: an `evaluations` table — one row per analyzed ply `(game_id, ply, cp | mate)` — plus an
  `analyzed` flag on `games` (twin of `move_habits_computed`, ADR-0005) for incrementality. **No**
  severity column, **no** danger table.
- **Thresholds, window, and the cp→win% curve can all change with zero engine re-run** — re-derive
  from the stored Evaluations. Lichess's exact cp→win% regression is proprietary; we adopt the
  **method and thresholds** with the standard public winning-chances sigmoid — faithful in method,
  not bit-identical.
- Analysis evaluates **every position** of a Game (needed for consecutive best-vs-played deltas), at
  a **fixed depth 16** (reproducibility) — this is the expensive part, done **once per Game** (guarded
  by the `analyzed` flag).
- Severities and Danger positions are always **consistent** with the stored Evaluations (single
  source of truth). The deferred per-Move annotations on the Analyse page (US-7) reuse the same
  stored Evaluations with **no new engine work**.
- Engine execution itself (where/how it runs) is covered by **ADR-0008**; this ADR is only about
  **what is stored and how quality/danger are derived**.
- **Annotated by ADR-0012** (US-10b): the `evaluations` row also carries the ply's **FEN**, written
  by the pass that already computed it. That does not weaken "derive on the fly" — severities and
  Danger positions are still derived at read time, and a FEN bakes in none of the thresholds this
  ADR was protecting. It removes a full cm-chess PGN replay per Game per request (measured: 2419 ms
  of a 2.5 s `/danger` response at 50 Games).
