# Persist the Analysis pass; keep its progress derived from the stored Evaluations

US-4 kept the `Analysis pass` entirely in the job's memory (`{running, total, done}`), so its
progress died with the process and its *end* left no trace at all — the Player was left guessing
whether a minutes-long pass had succeeded (US-8). We now **persist one row per pass** (the Games
it covers, the total number of `Position`s to evaluate, when it started and ended, its
**outcome**, and whether the Player has acknowledged the summary), while **`done` stays derived**
— it is `COUNT(*)` over the `evaluations` rows of the pass's Games, never an incremented counter.

The pass therefore advances in **Positions evaluated**, not in Games: `done` counts exactly what
the `evaluations` table holds, which is also what makes a single-Game pass show real movement
instead of sitting at `0/1` for its whole ~75 s.

## Considered options

- **Keep the status in memory (status quo).** Nothing to build, but the summary cannot survive a
  page reload or a restart, and a pass interrupted mid-flight is indistinguishable from one that
  never ran. Rejected — that indistinguishability *is* US-8's problem.
- **Persist an incremented `done` counter on the pass row.** Rejected: a second source of truth
  next to `evaluations`, which drifts the moment the process dies between the `INSERT` of an
  Evaluation and the increment. The stored Evaluations already *are* the progress.
- **Persist the pass framing, derive `done` (chosen).** The row records what the pass *is*
  (roster, total, lifecycle); the `evaluations` table remains the only record of what was
  actually done. This keeps ADR-0009's grain — store the expensive artifact once, derive the
  rest — rather than contradicting it.

## Consequences

- **Schema**: an `analysis_passes` table. `(game_ids, total, started_at, ended_at, outcome,
  acknowledged_at)`. No progress column.
- **Three explicit outcomes** (`completed` / `interrupted` / `failed`, see CONTEXT.md). The
  engine failure that `createAnalysisJob` currently swallows into a `console.error` becomes
  **visible to the Player**: today, an engine that fails to load leaves the app pretending
  nothing happened.
- **Orphan reconciliation at boot**: a row left without `ended_at` by a shutdown is closed as
  `interrupted` at startup. A dead pass is **never auto-resumed** — every engine run in this app
  is Player-triggered (as `Import` is), and silently burning CPU on boot would break that.
- `acknowledged_at` is a **display** concern only: acknowledging a summary hides it, and changes
  neither the pass's outcome nor the Evaluations it retained. A `failed` pass stays failed.
- `GET /api/analyze/status` reports the **last** pass, running or not, so the summary survives a
  reload; its response gains the outcome and the acknowledgement, and its progress unit changes
  from Games to Positions.
