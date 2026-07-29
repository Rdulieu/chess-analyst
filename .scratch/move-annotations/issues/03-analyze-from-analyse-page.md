Status: ready-for-agent

## Parent

`.scratch/move-annotations/PRD.md` (US-7 — BACKLOG.md).

Implemented on the business-story integration branch
`integration/US-7-mistake-annotations-on-analysis` — branch from it and merge back into it via PR,
**not** `develop`. Auto-merges into this integration branch once the local check (build + tests +
this issue's Feature Path) is green.

## What to build

Let the Player trigger analysis for **the one Game they're viewing** directly from the Analyse
page, instead of having to leave for "Mes parties":

- When the loaded Game's `analyzed` flag is false, the Analyse page shows an explicit message
  (not a silently blank board) and an "Analyser" action scoped to **this Game only**.
- Clicking it starts the analysis pass reusing the **existing** analysis-job endpoint (already
  accepts an arbitrary `gameIds` array — no server change needed here), called with this Game's id
  alone, and reuses the **existing** progress-polling mechanism (already wired on "Mes parties")
  rather than a second implementation of the same polling loop.
- Progress is shown on the Analyse page while the pass runs.
- Once the pass completes, the page automatically refreshes the Game and fetches issue 01's
  annotations, so the move-list flags/`Evaluation`s (and issue 02's bar/highlight, if merged)
  appear without a manual reload.

## Acceptance criteria

- [ ] Opening Analyse for a not-yet-analyzed Game shows an explicit invitation message, not a
      silently blank/incomplete-looking page.
- [ ] The "Analyser" action on this page only ever analyzes the one Game currently open — it never
      starts a batch over other Games.
- [ ] Clicking it reuses the existing analysis-job start and status-polling logic rather than a
      new/duplicated implementation.
- [ ] Progress is visible on the Analyse page while the pass runs.
- [ ] Once the pass completes, the Game's `analyzed` state and its annotations are fetched and
      rendered automatically, with no manual page reload.
- [ ] "Mes parties" and its own analyze/progress flow are unaffected.

### Feature Path (FP)

1. Open Analyse for a not-yet-analyzed fixture Game → see the explicit not-analyzed message and an
   "Analyser" action (not "Mes parties"' whole-selection action).
2. Click it → progress is shown while the (fixture-backed) analysis pass runs.
3. Once it completes → the move list's quality flags and `Evaluation`s appear automatically,
   without reloading the page.

Verify: UI first (the message, the action, the progress readout, the annotations appearing).

## Blocked by

- Issue 01 (Move quality + Evaluation annotations on the move list) — the "appears automatically"
  behavior renders through its move list; not blocked by issue 02.
