Status: done — auto-merged into `integration/US-8-analysis-pass-completion` (PR #15).
Green local check: build + lint + 193 tests (102 server, 91 client). Feature Path run UI-first
against the running app (Chrome over CDP, real Stockfish WASM, throwaway DB seeded with the
`seed:move-habits` fixture) — all three steps green. One bug found and fixed during the FP
(`84ad88f`): both entry points cleared the status right after the poll loop, so React coalesced
the last progress update with the reset and the completed figure was never painted — the readout
just vanished. The lower tiers missed it (they asserted the values handed to the component, not
what stayed on screen); a client test now locks it.
Non-blocking findings left open: the Analyse page carries two live regions (`role="status"`) plus
an unlabelled empty one — pre-existing, from US-7; and the summary does not survive a reload,
which is issue 02's scope.

## Parent

`.scratch/analysis-pass-completion/PRD.md` (US-8 — BACKLOG.md). Decisions: **ADR-0010**; glossary
term **`Analysis pass`** (CONTEXT.md).

Implemented on the business-story integration branch
`integration/US-8-analysis-pass-completion` (already pushed) — branch sub-work from it and merge
back into it via PR, **not** `develop`. Auto-merges into this integration branch once the local
check (build + tests + this issue's Feature Path) is green.

## What to build

The tracer bullet: give the `Analysis pass` a persisted row and make its progress advance in
`Position`s evaluated instead of in whole Games — so a single-Game pass stops reading `0/1` for
its entire ~75 s.

- **Schema**: an `analysis_passes` table recording what a pass *is* — the Games it covers, the
  **total** number of Positions to evaluate, and when it started and ended. **No progress
  column**: per ADR-0010, `done` is derived as a `COUNT` over the `evaluations` rows of the pass's
  Games (served by that table's existing `(game_id, ply)` primary key). An incremented counter
  would be a second source of truth that drifts the moment the process dies between an `INSERT`
  and the increment. Dev-phase rules apply — new table, no backfill.
- **Job**: `createAnalysisJob` keeps its interface (`start` / `status` / `idle`) and takes
  ownership of the row — writing it at `start`, closing it when the pass finishes, and deriving
  `done` on every `status()` read. `total` is computed once at start by counting each pending
  Game's Positions from its PGN (chess parsing only, no engine — negligible against ~75 s per
  Game). Single-flight and "nothing to do" behaviour are unchanged; "nothing to do" opens no row.
- **API**: `GET /api/analyze/status` reports progress in Positions and carries the number of Games
  in the pass. It reports the **last** pass, running or not — the groundwork for issue 02's
  summary surviving a reload.
- **Client**: the progress readout is currently **duplicated** between "Mes parties" and the
  Analyse page (both rendering "parties analysées"). Extract it into **one dedicated component**
  called from both entry points — per the project rule that a feature is carried by a single
  standalone unit called from every entry point, never inlined twice. It reads Positions, keeps
  its `role="status"`, and `runAnalysis` remains the single start+poll implementation, following
  the widened contract.

Wording follows the glossary: the readout counts **Positions evaluated**, not "coups" — a Game
stores one Evaluation per Position *including the initial one*, so an 80-half-move Game yields 81
rows, and calling those "coups" would contradict CONTEXT.md's own `Position`/`Move` distinction.

## Acceptance criteria

- [ ] A pass writes exactly one `analysis_passes` row at start, closed when the pass ends.
- [ ] No column stores progress; `done` is derived from the stored `Evaluation`s.
- [ ] `done` is correct mid-pass, not only at the end (assert a partial count while a pass runs).
- [ ] `total` equals the number of Positions across the pass's pending Games (initial Position
      included), verified on a hand-counted fixture.
- [ ] A pass over Games that are already analyzed opens no row and reports nothing to do.
- [ ] A second `start` while a pass runs is ignored (single-flight unchanged, existing tests pass).
- [ ] `GET /api/analyze/status` returns the last pass whether or not one is running.
- [ ] The status payload carries the Game count of the pass alongside the Positions progress.
- [ ] One component renders the progress readout; neither entry point inlines its own copy.
- [ ] The readout keeps `role="status"` so a long pass stays announced to assistive technology.
- [ ] Existing analysis tests still pass (the job's public interface is unchanged).

### Feature Path (FP)

1. Start an analysis on a single not-yet-analyzed Game → a count of evaluated Positions appears
   and **advances** while the pass runs (it does not sit at zero).
2. Wait for the pass to end → the count reaches its total.
3. Start an analysis on a single Game from that Game's review page → the same readout behaves the
   same way.

Verify: UI first. Probe the store only to confirm no progress column is being written.

## Blocked by

None - can start immediately.
