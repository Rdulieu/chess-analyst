# Analysis pass completion feedback — know it finished, without guessing

Status: ready-for-agent
Business ref: BACKLOG.md — US-8
Integration branch: `integration/US-8-analysis-completion-feedback` (cut from up-to-date
`develop`).
Decisions: no new ADR (a small, additive UI fix — no hard-to-reverse or surprising trade-off).
Glossary terms (CONTEXT.md): **`Analysis pass`** (new term, added during grilling — running /
completed / interrupted), `Evaluation`. Dev-phase rules apply, though no schema change is needed
here.

## Problem Statement

On "Mes parties" (`GamesPage`), the Player starts an `Analysis pass` and watches a determinate
progress readout ("3/10 parties analysées"). The moment the pass stops, that readout **vanishes**
— there is no confirmation the pass actually finished, and no distinction at all between "it
finished successfully" and "it stopped partway through after a backend error" (which today is
swallowed into a server log the Player never sees). The Player is left guessing whether it's safe
to assume their Games are analyzed.

## Solution

Turn the progress readout into a **permanent** completion message instead of one that disappears:
once the pass stops, it shows how many Games were reached and whether the pass **completed**
(every selected Game analyzed) or was **interrupted** (stopped early because of a backend error —
reported generically, with the reached count, not which Game or why). That message stays exactly
as-is — no toast, no expiry, no "seen it" tracking — until the Player's next action (a new
selection or a new pass) replaces it. It also survives a reload: reopening "Mes parties" checks
the last pass's outcome, so leaving mid-pass and coming back still shows the result. No new
concept beyond what already exists: this reuses the existing background job and its
`done`/`total`/`running` status, read slightly differently.

## User Stories

1. As the Player, when my `Analysis pass` finishes successfully, I want a clear, persistent confirmation ("X/Y parties analysées"), so that I know for certain it worked without having to infer it from the progress bar disappearing.
2. As the Player, when my `Analysis pass` is interrupted by a backend error before reaching every selected Game, I want that stated plainly (how many were reached, and that it stopped early), so that a silent failure never looks identical to a silent success.
3. As the Player, I don't need to know which specific Game caused an interruption or why, so that the message stays simple rather than becoming a diagnostic report.
4. As the Player, when a `Analysis pass` reaches nothing (nothing selected, or everything already analyzed), I want no confirmation message shown at all, so that an empty/no-op action doesn't produce a misleading "success" readout.
5. As the Player, I want the completion message to stay visible exactly as it is (no auto-dismiss, no timer), so that I can read it whenever I check back, not just in the few seconds after it appears.
6. As the Player, I want the completion message to survive leaving the page and coming back (even after a reload), so that starting a long pass and returning later still tells me how it went.
7. As the Player, I don't need the message to expire or be marked "stale" if I come back much later, so that I always see the true, unambiguous outcome of the last pass I ran.
8. As the Player, I want the completion message replaced once I make a new Game selection or start a new pass, so that an old result is never confused with a new one.
9. As the Player, I want the Games that did complete before an interruption to keep their "analysée" badge, so that partial progress from an interrupted pass is not lost or hidden.
10. As the Player, I want this confirmation to use the same plain, permanent-text style already used everywhere else in the app (no pop-up/toast notification pattern), so that it feels consistent with the rest of the UI.
11. As the Player, I don't need the existing "✓ analysée" per-Game badge to change, so that this fix stays about the end-of-pass confirmation, not a redesign of the badge.
12. As the Player, I want this fix to apply to the `Analysis pass` I start from "Mes parties" specifically, so that it addresses the flow where the ambiguity was actually found.
13. As a developer, I want the completed/interrupted distinction derived from the existing `done`/`total`/`running` status (no new server field), so that the fix stays a client-side read of information the server already exposes.
14. As a developer, I want "Mes parties" to also fetch the pass status once when the page loads (not only right after clicking "Analyser"), so that a pass that finished while the page was closed or reloaded is still reflected.
15. As a developer, I want the interruption behaviour that already exists at the job level (an error ends the pass cleanly, `done` stays below `total`) to gain an explicit regression test asserting Games analyzed before the error keep their `analyzed` flag, so that the reassurance story ("what did and didn't complete") is verifiably true, not just assumed.

## Implementation Decisions

- **No API contract change.** `GET /api/analyze/status` keeps its existing shape
  (`{ running, total, done }`). The distinction the Player sees is derived, not a new field:
  - **completed**: `!running && total > 0 && done === total`
  - **interrupted**: `!running && total > 0 && done < total`
  - **nothing to show**: `total === 0` (fresh state, or a pass that had nothing to do) — no
    message rendered.
  - This is a safe derivation given the job's current behaviour: the only way a started pass ends
    with `done < total` is a thrown error stopping the loop early (no other break condition
    exists) — the existing "ends the pass instead of crashing" test already exercises this shape.
- **"Mes parties" (`GamesPage`)**:
  - Fetches the pass status **once on page load**, in addition to the existing click-triggered
    start + poll loop, so a pass that finished (or was already sitting completed/interrupted from
    an earlier visit) is reflected immediately.
  - The progress `<p role="status">` becomes **permanent** once the pass stops (instead of being
    cleared to `null`): its text switches from the in-progress wording ("X/Y parties analysées")
    to a completed or interrupted wording that's textually distinct (e.g. a "terminé" vs.
    "interrompu" qualifier) — still the same single status line, no new UI element/pattern.
  - The message is cleared (so the next state — running, then completed/interrupted, or nothing —
    takes over cleanly) when the Player toggles the Game selection or starts a new pass; it is
    **not** cleared by time or by being displayed.
- **No change** to the per-Game "✓ analysée" badge (`GameList`), to the job/service layer's actual
  analysis behaviour, or to the API surface beyond how the client reads the existing status.
- **Scope boundary**: this only covers the "Mes parties" entry point. US-7's separate "Analyser"
  action on the Analyse page (its own sub-issue, not yet implemented) has its own acceptance
  criteria for its completion signal and is not touched here.

## Testing Decisions

Good tests assert observable behaviour — what the status derivation returns for a given
`running`/`total`/`done`, and what "Mes parties" renders — never internal call counts or timers.

- **Job-level regression** — extend the existing analysis-job test suite: seed several Games,
  make the engine fail partway through, and assert that Games processed **before** the failure
  keep `analyzed: true` while the one mid-failure (and any after it) do not, and that
  `done < total` once `running` is `false`. Prior art: `server/test/analysis.test.ts`'s existing
  "ends the pass instead of crashing" test (extend it rather than duplicate it).
- **Client — status derivation (pure)** — unit test the completed/interrupted/nothing-to-show
  cases directly against `{ running, total, done }` combinations, including the edge cases
  (`total === 0`, `done === total`, `done < total`).
- **Client — `GamesPage`** — mocked fetch: extend the existing analysis-pass tests to assert the
  progress line **persists** with completed wording after the poll loop ends (instead of
  disappearing); a scenario where the mocked status poll resolves to `running:false` with
  `done < total` shows the interrupted wording; a fresh page load whose status fetch already
  returns a completed/interrupted result (no button click) renders the message immediately;
  toggling the selection after a message is shown clears it. Prior art:
  `client/test/GamesPage.test.tsx`'s existing "selects a Game, runs the analysis... shows
  'analysée' when done" test.
- **Test pyramid apex — Feature Path (agentic, deterministic, fixture `Engine`)**: the real app,
  fixture `Engine`, over a tiny fixture selection → select Games, run the analysis, watch progress
  reach done === total, and confirm the confirmation message **stays visible** (not just flashes)
  and reads as completed → reload the page → the same message is still there. The interrupted-path
  wording is **not** exercised at this tier (deliberately breaking the engine mid-run isn't
  something the fixture supports today as a black-box user journey); it stays covered by the
  job-level and component tests above.
- **Happy Path**: not proposed — this is a small, additive fix to an existing flow already
  exercised by HP-01 (import → analyze → explore); no new HP warranted, and the HP budget is
  already at 3/3.

## Out of Scope

- **Identifying which Game caused an interruption, or why** — the message stays generic
  (reached count only).
- **A toast/notification UI pattern** — stays a permanent inline status line, matching the rest of
  the app.
- **Redesigning the "✓ analysée" per-Game badge** — unchanged.
- **The Analyse page's own "Analyser this Game" entry point (US-7)** — has its own completion
  behaviour, defined in its own issue.
- **Message staleness/"seen it" tracking, or persisting the result beyond the job's own in-memory
  state** — the message reflects the job's current status as-is, for as long as the app process
  keeps it, with no added bookkeeping.
- **Retry/resume UX beyond what already exists** — the pass is already incremental (re-running
  skips analyzed Games); no new resume affordance is added.
- **Multi-tab/session synchronization** — out of scope for this local, single-user app
  (ADR-0002).

## Further Notes

- `CONTEXT.md` gained a new `Analysis pass` term during grilling (running / completed /
  interrupted) — the vocabulary this PRD's user stories and acceptance criteria are written in.
- This is one of the smallest PRDs in the backlog so far: no schema, no new endpoint, no new
  client type — the fix is entirely in how `GamesPage` reads and renders the status it already
  polls. Expect `/to-issues` to likely produce a single sub-issue rather than a multi-slice split.
- The partial-persistence behaviour (Games analyzed before an interruption keep their `analyzed`
  flag) already exists in `analyzeGame`'s per-Game commit — this PRD adds a regression test for
  it, not new behaviour.
- Move `BACKLOG.md` US-8 to "Doing" with this PRD path + branch when `/to-issues` runs.
