Status: ready-for-agent

## Parent

`.scratch/analysis-completion-feedback/PRD.md` (US-8 — BACKLOG.md).

Implemented on the business-story integration branch
`integration/US-8-analysis-completion-feedback` (already pushed) — branch from it and merge back
into it via PR, **not** `develop`. Auto-merges into this integration branch once the local check
(build + tests + this issue's Feature Path) is green.

## What to build

On "Mes parties" (`GamesPage`), turn the `Analysis pass` progress readout into a **permanent**
completion message instead of one that vanishes the moment the pass stops:

- Derive the outcome from the existing `GET /api/analyze/status` shape (`running`/`total`/`done`)
  — **no API or schema change**:
  - **completed**: `!running && total > 0 && done === total`
  - **interrupted**: `!running && total > 0 && done < total` (a backend error stopped the pass
    early — no other reason a started pass can end with `done < total`)
  - **nothing to show**: `total === 0` (fresh state, or a pass that had nothing to analyze)
- The existing `<p role="status">` line switches, once the pass stops, from the in-progress
  wording to a **completed** or **interrupted** wording that reads distinctly (e.g. a
  "terminé"/"interrompu" qualifier) — still one status line, no toast/notification pattern, no
  per-Game error detail (generic reached-count only).
- The page **also fetches the status once on load**, in addition to the existing click-triggered
  start + poll loop, so a pass that finished while the page was closed/reloaded is still reflected
  as soon as "Mes parties" opens.
- The message stays exactly as shown — no auto-dismiss, no expiry/staleness tracking — until the
  Player toggles the Game selection or starts a new pass, either of which clears it so the next
  state (running, then its own outcome, or nothing) takes over cleanly.
- No change to the per-Game "✓ analysée" badge, to the job/service layer's analysis behaviour, or
  to the API surface itself.

## Acceptance criteria

- [ ] After a pass completes (`done === total`), the status line persists with wording that reads
      as "completed" — it does not revert to blank/`null`.
- [ ] After a pass is interrupted (`done < total`, `running` false), the status line persists with
      wording that reads distinctly as "interrupted", showing how many Games were reached — no
      identification of which Game or why.
- [ ] When a pass had nothing to analyze (`total === 0`), no completion/interruption message is
      shown.
- [ ] Loading (or reloading) "Mes parties" fetches the current pass status and renders the
      completed/interrupted message immediately if one applies, without requiring a fresh click on
      "Analyser".
- [ ] The message does not disappear or change on its own over time — it is only replaced when the
      Player toggles a Game's selection or starts a new pass.
- [ ] Games that completed analysis before an interruption keep their "✓ analysée" badge
      (regression: `analyzed` stays persisted per-Game even when a later Game in the same pass
      fails) — covered by a job-level test seeding several Games with a failing engine partway
      through.
- [ ] The per-Game "✓ analysée" badge itself is visually unchanged.
- [ ] "Mes parties"' existing analyze/progress flow (selection, disabled state while running, live
      progress readout) is otherwise unaffected.

### Feature Path (FP)

1. On "Mes parties", select one or more not-yet-analyzed fixture Games and start the analysis →
   progress advances to done === total.
2. The status line stays visible and reads as completed (not blank) once the pass stops.
3. Reload the page → the same completed message is still shown, without clicking "Analyser" again.

Verify: UI first (the rendered status line, before and after reload). No backing-store probe
needed for this journey — the interrupted-path wording and the per-Game persistence regression are
covered by job-level/component tests, not this Feature Path (deliberately breaking the engine
mid-run isn't something the fixture supports today as a black-box user journey).

## Blocked by

None — can start immediately.
