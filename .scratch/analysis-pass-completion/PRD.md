# Analysis pass completion — know the pass finished, without guessing

Status: ready-for-agent
Business ref: BACKLOG.md — US-8
Integration branch: `integration/US-8-analysis-pass-completion` (cut from up-to-date `develop`,
worked in the worktree `../chess-analyst-US-8` while the main checkout hosts another grilling).
Decisions: **ADR-0010** (persist the `Analysis pass`, keep its progress derived from the stored
`Evaluation`s) — written during this story's grilling, commit `3f8e11c`.
Glossary terms (CONTEXT.md): **`Analysis pass`** (new entry, added during grilling — the glossary
had no term for the pass at all), `Position`, `Evaluation`, `Game`, `Player`, `Import`
(referenced: both are manual, never automatic). Dev-phase rules apply — the schema change needs no
backfill machinery.

## Problem Statement

The Player selects Games, clicks "Analyser la sélection", and then has to guess. A pass over a
handful of Games runs for minutes, and three things go wrong at once:

- **The progress readout barely moves.** It counts whole Games, so a single-Game pass reads
  `0/1 parties analysées` for its entire ~75 s and then jumps to `1/1`. Nothing distinguishes "it
  is working" from "it is stuck".
- **The end of the pass leaves no trace.** The readout simply disappears — no confirmation, no
  summary. The Player is left inferring success from the "analysée" badges, scanning a
  54-row list to work out what actually got done.
- **A failure is completely silent.** The job catches engine errors into a `console.error` and
  ends the pass as if nothing happened. If the engine backend fails to load, the app pretends the
  pass ran; the Player sees no error, only Games that mysteriously stayed unanalyzed.

Nothing about the pass survives a page reload or a server restart either: the status lives in the
job's memory, so a pass interrupted by a shutdown is indistinguishable from one that never ran.

## Solution

Give the `Analysis pass` a persisted life cycle and tell the Player, explicitly, how it ended.

- **Progress advances in `Position`s evaluated**, not in Games — the unit the engine actually works
  in, and exactly what the `evaluations` table records. A single-Game pass now shows steady
  movement instead of `0/1`.
- **The pass is persisted** (its Games, its total, when it started and ended, how it ended). The
  readout survives a page reload; the summary survives a server restart.
- **The pass ends in one of three explicit outcomes** — completed, interrupted, or failed — each
  with its own message. A failed pass finally surfaces the engine error that today only reaches
  the server console.
- **The final summary stays until the Player acknowledges it** ("3 parties · 312 positions
  évaluées ✓", with a way to dismiss it). Impossible to miss, impossible to leave cluttering the
  page forever.
- **The Game list states where things stand at a glance**: a reinforced "analysée" badge per Game,
  plus a global count above the list ("54 parties · 32 analysées") that is true at all times, not
  only just after a pass.

## User Stories

1. As a Player, I want the analysis progress to advance while a single Game is being analyzed, so
   that I can tell the pass is working rather than hung.
2. As a Player, I want the progress expressed in Positions evaluated, so that the number I watch
   is the actual unit of work the engine performs.
3. As a Player, I want the progress readout to show both the count done and the total, so that I
   can estimate how much is left.
4. As a Player, I want an explicit confirmation when the pass completes, so that I do not have to
   infer success from badges scattered down a long list.
5. As a Player, I want the completion summary to state how many Games and how many Positions were
   covered, so that I can check it matches what I selected.
6. As a Player, I want the summary to remain on screen until I dismiss it, so that stepping away
   during a minutes-long pass does not mean missing the confirmation.
7. As a Player, I want to dismiss the summary once I have read it, so that it does not clutter the
   page on every later visit.
8. As a Player, I want the summary to still be there after reloading the page, so that a refresh
   mid-pass does not lose the outcome.
9. As a Player, I want the summary to still be there after restarting the app, so that the
   confirmation does not depend on the process staying alive.
10. As a Player, I want to be told when the pass failed, so that I stop waiting for results that
    will never arrive.
11. As a Player, I want the failure message to include what went wrong (e.g. the engine backend
    could not start), so that I have somewhere to start fixing it.
12. As a Player, I want a pass cut short by shutting the app down to be reported as interrupted
    rather than completed, so that I am not told a job finished when it did not.
13. As a Player, I want an interrupted or failed pass to keep the Evaluations it already produced,
    so that no engine time is wasted.
14. As a Player, I want re-running a pass to pick up only the Games still unanalyzed, so that
    recovering from an interruption is cheap.
15. As a Player, I want the app never to start an analysis pass on its own at startup, so that it
    never burns CPU without my asking.
16. As a Player, I want the "analysée" badge to be obvious at a glance in a long Game list, so
    that I can scan the list without squinting.
17. As a Player, I want the badge to be legible without relying on colour alone, so that it works
    regardless of how I perceive colour.
18. As a Player, I want a running count of analyzed Games above the list, so that I know my overall
    position without scrolling through every row.
19. As a Player, I want that global count to be accurate whenever I open the page, not only right
    after a pass, so that I can use it to decide what to analyze next.
20. As a Player, I want the same progress and summary behaviour when I analyze a single Game from
    the Analyse page, so that the app behaves consistently wherever I trigger a pass.
21. As a Player, I want the progress readout to be announced to assistive technology, so that the
    state of a long-running pass is available without watching the screen.
22. As a Player, I want the Game list to refresh once the pass ends, so that the badges reflect
    what just happened without a manual reload.
23. As a Player analyzing Games already analyzed, I want to be told there was nothing to do, so
    that an instantly-finished pass does not look like a failure.

## Implementation Decisions

### Schema — a persisted pass, no persisted progress

- New `analysis_passes` table (server schema). Columns: the Games covered by the pass, the
  **total** number of Positions to evaluate, `started_at`, `ended_at`, `outcome`, an optional
  error message, and `acknowledged_at`.
- **No progress column.** `done` is derived: a `COUNT` over the `evaluations` rows of the pass's
  Games, served by that table's existing `(game_id, ply)` primary key. Per ADR-0010, an
  incremented counter would be a second source of truth that drifts the moment the process dies
  between an `INSERT` and the increment.
- `total` is computed once at pass start by counting the Positions of each pending Game from its
  PGN (chess parsing only, no engine) — negligible against the engine's ~75 s per Game.
- `acknowledged_at` is a **display** concern only: it hides the summary and changes neither the
  outcome nor the retained Evaluations. A failed pass stays failed once acknowledged.
- Dev-phase rules apply: new table, no backfill for pre-existing rows.

### The analysis job owns the pass life cycle

- `createAnalysisJob(db, engine)` keeps its current interface (`start` / `status` / `idle`) and
  gains ownership of the persisted pass: it writes the row on `start`, closes it on completion or
  failure, and derives `done` on every `status()` read.
- **Boot reconciliation happens at job construction**: any row left without `ended_at` is closed
  as `interrupted`. No separate exported function and no explicit call from the server entry
  point — a job cannot exist without having reconciled, so the step cannot be forgotten.
- **A dead pass is never auto-resumed.** Every engine run in this app is Player-triggered, exactly
  as `Import` is (CONTEXT.md); silently starting minutes of CPU work at boot would break that.
- The `catch` around the pass loop stops swallowing errors into `console.error`: it records
  `failed` plus the error message on the pass row. The pass still stops at the first error (the
  current behaviour) — continuing past a broken Game is explicitly not decided here.
- Single-flight behaviour is unchanged: a `start` while a pass is running is ignored.
- "Nothing to do" (every given Game already analyzed) remains a non-running result and does not
  open a pass row.

### API contract

- `GET /api/analyze/status` reports the **last** pass, running or not — this is what lets the
  summary survive a reload. Its payload carries the progress in Positions (`done`, `total`), the
  `running` flag, the `outcome` (absent while running), the error message when failed, the count
  of Games in the pass (for the summary line), and whether it has been acknowledged.
- `POST /api/analyze/acknowledge` acknowledges the last pass. No body, no pass identifier: the
  client only ever knows "the last pass", and the route is named after the business act,
  symmetrically with the `POST /api/analyze` that starts one.
- `POST /api/analyze` is unchanged (202 + the starting status).

### Client

- `runAnalysis` remains **the single implementation** of the start+poll loop, shared by "Mes
  parties" and the Analyse page. It follows the widened status shape.
- The progress readout is currently **duplicated** between `GamesPage` and `GameViewer` (both
  rendering "parties analysées"). It becomes **one dedicated component** rendering progress,
  summary and acknowledge control, called from both entry points — per the project rule that a
  feature is carried by one standalone unit called from every entry point, never inlined twice.
- On mount, both entry points read the status so a persisted summary reappears after a reload.
- The Game list gains a reinforced badge (inline style — the app ships no stylesheet — with a
  textual/checkmark cue, never colour alone) and a global "N parties · M analysées" count computed
  from the already-loaded Games, with no extra server call.
- The `role="status"` on the progress readout is kept, so the pass state stays announced.

## Testing Decisions

A good test here exercises the pass through its public seams and asserts what the Player would
observe — the reported progress, the outcome, what the page shows — never how the job stores its
row. The existing suites already work this way and are reused rather than replaced.

**Seams (all four already exist, none is added):**

- **`createAnalysisJob(db, engine)`** — prior art: `server/test/analysis.test.ts`. The `Engine` is
  already injected, and that suite already builds a fake that throws, so the `failed` outcome
  plugs straight into an existing pattern. Covers: `done` derived from stored Evaluations, the
  three outcomes, boot reconciliation (construct a job over a database holding an unclosed pass),
  single-flight, "nothing to do", and that construction never resumes work.
- **`createApp(db, chessCom, engine)` + supertest** — prior art: `server/test/api.test.ts`.
  Covers the `GET /api/analyze/status` payload (Positions unit, outcome, Game count,
  acknowledgement) and `POST /api/analyze/acknowledge`.
- **Pages via RTL with a stubbed `fetch`** — prior art: `client/test/GamesPage.test.tsx`,
  `GameViewer.test.tsx`. Covers the summary appearing on mount, being dismissed, the three outcome
  messages, the badge and the global count.
- **`runAnalysis`** — prior art: `client/test/runAnalysis.test.ts`. Covers the start+poll loop
  against the widened contract.

Tests never invoke the real Stockfish: the fixture `Engine` is the default in `createApp`, per
ADR-0008.

**Apex — agentic tests.** Each slice from `/to-issues` carries its own executable **Feature Path**
as the auto-merge gate (UI-first, against the running app with the fixture engine). The natural
FP shape here: start a pass, watch the Positions counter move, see the summary at the end, dismiss
it, reload and confirm it stays dismissed; and a variant with a failing engine backend asserting
the error is shown. The **HP budget is at 3/3**, so no new happy path — the completion summary
should be grafted onto **HP-01**'s existing analysis step (step 8) rather than opening a fourth
suite, and that graft is a `/to-issues` deliverable.

## Out of Scope

- **Continuing a pass past a broken Game.** The pass stops at the first engine error, as today;
  `failed` + the derived `done` describes that situation adequately. Partial-failure reporting
  ("2 Games analyzed, 1 failed") is a separate decision.
- **Auto-resuming an interrupted pass**, at boot or otherwise — explicitly rejected during
  grilling.
- **A history of past passes.** The table will accumulate rows, but only the last pass is read or
  shown. No history view, no retention policy.
- **Per-Position or time-remaining estimates.** The counter is a count, not an ETA.
- **Cancelling a running pass.** Not asked for by US-8; the only way to stop one remains shutting
  the app down (which now reports `interrupted`, an improvement in itself).
- **The two other findings left open by US-7's PR** — the Import button staying enabled during an
  import, and `/danger` having no minimum-sample guard. They belong to US-9 and US-10.
- **Notifications outside the app** (desktop notification, sound) for a finished pass.

## Further Notes

- The grilling added **`Analysis pass`** to CONTEXT.md. The glossary had no term for it even
  though US-4 introduced the concept — the pass was only ever described in code comments.
- The unit question was settled on a vocabulary argument worth recording: `analyzeGame` stores one
  row per Position *including the initial one*, so an 80-half-move Game yields 81 rows. Showing
  "81 coups" for 80 Moves would contradict the glossary's own `Position`/`Move` distinction, in a
  story whose entire subject is trust. Counting Positions costs nothing (it is exactly the `COUNT`)
  whereas counting Moves would require subtracting one per Game and would make `done` wrong
  mid-pass.
- Making engine failures visible is a genuine gap-closer beyond US-8's original wording: today,
  an engine backend that fails to load produces a silent no-op pass. The native backend
  (`STOCKFISH_PATH`) has never been verified empirically for want of a UCI binary, so this is a
  realistic failure mode, not a hypothetical one.
