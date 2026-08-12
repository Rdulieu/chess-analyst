Status: ready-for-agent

## Parent

`.scratch/analysis-pass-completion/PRD.md` (US-8 — BACKLOG.md). Decisions: **ADR-0010**; glossary
term **`Analysis pass`** (CONTEXT.md).

Implemented on the business-story integration branch
`integration/US-8-analysis-pass-completion` — branch sub-work from it and merge back into it via
PR, **not** `develop`. Auto-merges once the local check (build + tests + this issue's Feature
Path) is green.

## What to build

The heart of US-8: when a pass ends, say so — and keep saying so until the Player has actually
seen it.

- **Summary**: the progress readout becomes a completion summary once the pass is over, stating
  both figures the Player can check against what they selected: the number of Games and the
  number of Positions evaluated (e.g. "3 parties · 312 positions évaluées ✓"). Rendered by the
  component extracted in issue 01, so both entry points get it for free.
- **Persistence of the summary**: because `GET /api/analyze/status` already reports the last pass
  (issue 01), both entry points read it **on mount** — a summary therefore survives a page reload
  and, since the row is persisted, a server restart.
- **Acknowledgement**: `POST /api/analyze/acknowledge` marks the last pass as seen (an
  `acknowledged_at` on the row); the summary offers a way to dismiss it and does not come back
  afterwards. No body and no pass identifier on the route — the client only ever knows "the last
  pass", and the name mirrors the `POST /api/analyze` that starts one.
- **Acknowledgement is display-only**: it hides the summary and changes neither the pass's outcome
  nor the `Evaluation`s it retained.
- **Nothing to do**: a pass over already-analyzed Games must read as "there was nothing to
  analyze", never as a failure or an empty result the Player has to interpret.
- Once a pass ends, the Game list refreshes so the "analysée" marks reflect what just happened,
  with no manual reload.

## Acceptance criteria

- [ ] The summary states the number of Games **and** the number of Positions evaluated.
- [ ] The summary appears at both entry points ("Mes parties" and the Game review page) from the
      one shared component — no second copy.
- [ ] Opening either page with an unacknowledged finished pass shows its summary.
- [ ] `POST /api/analyze/acknowledge` acknowledges the last pass; a second call is harmless.
- [ ] After acknowledgement the summary is gone and does not reappear on reload.
- [ ] Acknowledging leaves the pass's outcome and its stored `Evaluation`s untouched.
- [ ] A pass with nothing to analyze produces an explicit "nothing to do" message, distinct from
      both a completed pass and a failure.
- [ ] The Game list is refreshed once the pass ends.
- [ ] Starting a new pass replaces the displayed summary with live progress.

### Feature Path (FP)

1. Start an analysis over two not-yet-analyzed Games and wait for it to finish → a summary
   confirms the pass ended, stating how many Games and how many Positions were covered.
2. Reload the page → the summary is still there.
3. Dismiss the summary → it disappears.
4. Reload the page again → it does not come back.
5. Start an analysis over Games that are already analyzed → the app says there was nothing to do,
   and this does not read as a failure.

Verify: UI first.

## Blocked by

`.scratch/analysis-pass-completion/issues/01-positions-progress-on-a-persisted-pass.md`
