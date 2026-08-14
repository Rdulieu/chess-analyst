Status: ready-for-agent

## Parent

`.scratch/danger-page-waiting/PRD.md` (US-10b — `BACKLOG.md`).
Decision: **ADR-0012** (`docs/adr/0012-store-the-per-ply-fen-beside-the-evaluation.md`), with
ADR-0009 annotated accordingly.

Implemented on the business-story integration branch
`integration/US-10b-danger-page-waiting` — branch sub-work from it and merge back into it via
PR, **not** `develop`. Auto-merges once the local check (build + tests + this issue's Feature
Path) is green.

## What to build

Delete the cost instead of hiding it. Measured on the real history: `/danger` takes **2.5 s at 50
analyzed Games**, of which **2419 ms is a full cm-chess replay of every Game's PGN** — done on every
single request, solely to recover per-ply FENs that the `Analysis pass` already held in hand. (The
N+1 `evaluations` query the backlog suspected costs **41 ms**; it was never the problem.) At a
year's history — ~650 Games, which US-9's range import makes a one-click affair — that projects to
**~31 s** of synchronous work blocking the whole server, per page view.

- `evaluations` carries a **`fen`** column, **required in `schema.ts`** so no insert path can omit
  it and the derivation never has a null to reason about.
- **The `Analysis pass` writes it.** It computes the FEN anyway to query the engine. This is what
  holds the invariant long-term — the writer, not the repair.
- **`gamePlies()` reads the stored FEN** instead of calling `gamePositions()`. It is the shared
  entry point, so US-7's per-Move annotations inherit the same speedup with no change of their own.
- **Integrity check at open**, immediately after `migrate()` — ADR-0003 already makes launch the
  place where the database is brought up to date with no manual step. It detects `evaluations` rows
  with no FEN and repairs them by replaying their Game's PGN (~2.4 s once for the whole current
  database), and is **idempotent**: a second launch does nothing.
- **Repair, not re-analysis**: FENs are recoverable from the PGN in seconds, whereas a Stockfish
  pass costs minutes. The dev-phase "re-import is cheap" rule does not transfer to this table.
- **A Game whose PGN cannot be replayed** has its `Evaluation`s dropped and reverts to
  `analyzed = false`. Losing engine work is acceptable in dev phase; serving wrong FENs is not.

No new route, no background job, no polling — ADR-0012 rejects them explicitly rather than deferring
them. The FEN is denormalised against the PGN, which is accepted: Import dedups by game URL and
source PGNs are immutable.

## Acceptance criteria

- [ ] `evaluations` carries a `fen` column, required in the schema; no insert path can omit it.
- [ ] The `Analysis pass` writes the FEN for every `Evaluation` it produces.
- [ ] The shared per-ply derivation reads the stored FEN and no longer replays the PGN on the read
      path.
- [ ] `/danger` returns the same Positions in the same order as before this slice.
- [ ] The Analyse page's per-Move annotations are unchanged in content.
- [ ] Opening a database whose `Evaluation`s predate the column repairs them automatically, with no
      manual step and no engine run.
- [ ] A second open performs no repair work.
- [ ] A Game whose PGN cannot be replayed loses its `Evaluation`s and reverts to not-analyzed,
      rather than yielding wrong FENs.
- [ ] On the real history `/danger` drops from ~2500 ms to roughly ~100 ms (measured and reported,
      not asserted as a fixed number in a test).
- [ ] The integrity check is exercised through the database-opening seam on a temporary **file**
      database — `:memory:` cannot be reopened, and "the second open does no work" is the property
      that matters. Seed **short** Games: the longest Game in the real history costs 105 ms to
      replay on its own.

### Feature Path (FP)

1. Analyse Games, then open "Positions dangereuses" → the same Positions as before this slice, in
   the same order.
2. Measure the response time on a substantial analyzed history → it is an order of magnitude lower
   than before this slice.
3. Start the application from a database whose analyses predate the change → it starts without
   error and the page shows the same Positions, with nothing having been run by hand.
4. Restart → startup is immediate and no repair replays.
5. Open the Analyse page of an analyzed Game → the per-Move annotations are present, and faster.

Verify: UI first for steps 1, 3 and 5; steps 2 and 4 are observations of timing and of work not
being redone.

## Blocked by

- `.scratch/danger-page-waiting/issues/02-four-states-never-a-mute-screen.md` — the computing state
  is written and validated while the wait still lasts seconds; this slice reduces it to ~0.1 s.
