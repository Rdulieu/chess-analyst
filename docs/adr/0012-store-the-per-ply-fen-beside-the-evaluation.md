# Store the per-ply FEN beside the Evaluation

`/api/danger` was taking **2.5 s for 50 analyzed Games**, and the wait is linear in Games — a
year of imported history (~650 Games, which US-9's range import makes a one-click affair) projects
to **~31 s** of synchronous main-thread work on **every page view**. Measured breakdown: the N+1
`evaluations` query costs **41 ms**, the severity and aggregation work ~40 ms, and the remaining
**2419 ms is `gamePositions()`** — a full cm-chess replay of every Game's PGN, on every request,
solely to recover the per-ply FENs.

We therefore **store the FEN on the `evaluations` row**, written by the `Analysis pass` that
already holds it, and `gamePlies()` reads it instead of replaying the PGN. The derivation stays
exactly as ADR-0009 specified — severities and `Danger position`s are still computed at read time,
nothing aggregated is persisted. What changes is that the *input* to that derivation is read rather
than recomputed. `/danger` drops to ~0.1 s at 50 Games and ~1.3 s at 650, which is why US-10b needs
only a loading indicator and **no background job**.

This is a **deliberate exception to ADR-0009's "derive on the fly"**, and the boundary matters: 0009
forbids storing the *derived aggregate* (severities, danger counters) because that would bake the
10/20/30% thresholds and the cp→win% curve into the data, forcing a migration to retune them. A FEN
bakes in nothing — it is a fact about the Game, at the same granularity as the `Evaluation` already
stored on the same row, and no tuning can change it. ADR-0009's rule is intact; a per-ply FEN was
never the kind of thing it was protecting against.

## Considered options

- **Background job + polling**, mirroring the `Analysis pass` (ADR-0011). Rejected: it hides a cost
  rather than removing it, so the year-scale case stays a 31 s computation that merely happens
  elsewhere. It also has **no natural progress unit** (Games processed is an implementation detail,
  not something the Player asked about), and it would owe a persisted job, a reconciliation at boot
  and a polling loop — substantial machinery to dress up work we can delete outright.
- **Memoise the derivation, invalidated when `analyzed` changes.** Rejected: it trades a correctness
  risk (every future writer of `evaluations` must remember the invalidation) for a **cold path that
  is still 31 s** — precisely the first visit after an analysis pass, i.e. exactly when the Player
  goes to `/danger`.
- **A loading indicator alone.** Rejected as a *sufficient* answer: 31 s of blocked event loop is
  not a UI problem. It is retained as the *complement* of this decision, since ~1.3 s still deserves
  to be announced.

## Consequences

- **Existing `evaluations` rows have no FEN.** What keeps the invariant long-term is not a one-off
  fix but the **writer**: the `Analysis pass` writes the FEN it already holds, so every row created
  after this change is correct by construction, and the column is **required in `schema.ts`** so no
  insert path can omit it. Rows written *before* the column existed are handled by an **integrity
  check at open** — right after `migrate()` (ADR-0003 already makes launch the place where the
  schema is brought up to date), detecting `evaluations` rows with no FEN and repairing them by
  replaying the Games' PGNs (~2.4 s once for the whole current DB, 0 ms on every later launch).
  Repair rather than re-analysis: the FENs are recoverable from the PGN, whereas a Stockfish pass
  costs minutes. Where a Game's PGN cannot be replayed, its `Evaluation`s are dropped and the Game
  reverts to not-analyzed — losing engine work is acceptable in dev phase, serving wrong FENs is
  not. The backfill must be code, not SQL: no `ALTER TABLE` can replay a PGN.
- **The FEN is denormalised**: it duplicates what the Game's PGN implies. Should a Game's PGN ever
  be replaced by a different one, its stored FENs would drift. Import dedups by game URL and PGNs
  are immutable at the source, so this is accepted rather than guarded.
- **US-7's per-Move annotations get the same speedup for free**, since `gamePlies()` is the shared
  entry point (`server/src/analysis/derivation.ts`).
- Storage is negligible: ~60 bytes per ply — ~240 KB for 50 Games, ~3 MB for a year of play.
