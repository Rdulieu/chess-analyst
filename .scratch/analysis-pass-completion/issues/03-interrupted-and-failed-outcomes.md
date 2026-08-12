Status: done — auto-merged into `integration/US-8-analysis-pass-completion` (PR #17).
Green local check: build + lint + 209 tests (110 server, 99 client). Feature Path 4/4 green,
UI-first against the running app (Chrome over CDP, real Stockfish WASM). A long Game (34 Positions)
was inserted to get a *real* mid-flight kill — the fixture Games analyse too fast to interrupt.
Store probe: 34 Evaluations / 34 distinct plies for the interrupted-then-resumed Game (no
duplicate, no key violation), all three outcomes present, no error in the server log.

**Blocking finding found by the FP, fixed in `41cf1fe`**: step 1 was unexercisable. The native
Engine spawns at construction, so a missing `STOCKFISH_PATH` killed the server on ENOENT and a
non-UCI binary killed it on EPIPE — both before any pass could exist. The `failed` outcome this
issue introduces was therefore unreachable at runtime: a broken engine gave a dead app, not a
failed pass. The reproducing test did not even reject, it hung forever — a mute backend would have
left a pass running with no end. `createNativeEngine` now captures the child's error/exit and the
stdin EPIPE, and `evaluate` rejects with the reason.

Also defused the landmine flagged at grilling (half-evaluated Game vs the `(game_id, ply)` primary
key) and fixed slice 02's a11y finding (the dismiss button left the live region).
Non-blocking finding left open: an unacknowledged summary is silently superseded when a new pass
starts, since only the last pass is ever reported.

## Parent

`.scratch/analysis-pass-completion/PRD.md` (US-8 — BACKLOG.md). Decisions: **ADR-0010**; glossary
term **`Analysis pass`** and its three outcomes (CONTEXT.md).

Implemented on the business-story integration branch
`integration/US-8-analysis-pass-completion` — branch sub-work from it and merge back into it via
PR, **not** `develop`. Auto-merges once the local check (build + tests + this issue's Feature
Path) is green.

## What to build

Close the last gap: a pass that did **not** complete must say so, and say why. Today the job
catches engine errors into a `console.error` and ends as if nothing happened — an engine backend
that fails to load produces a silent no-op pass, and the Player only sees Games that mysteriously
stayed unanalyzed.

- **`failed`**: the `catch` around the pass loop records the outcome and the error message on the
  pass row instead of logging it away. The pass still stops at the **first** error (current
  behaviour) — continuing past a broken Game is explicitly out of scope.
- **`interrupted`**: a row left without an end (the app was shut down mid-pass) is closed as
  interrupted **at job construction**, so a job cannot exist without having reconciled and the
  step cannot be forgotten. A dead pass is **never auto-resumed**: every engine run in this app is
  Player-triggered, exactly as `Import` is (CONTEXT.md), and silently burning minutes of CPU at
  boot would break that.
- Whatever `Evaluation`s an interrupted or failed pass already produced are **kept** — the derived
  `done` reflects them, so no engine time is wasted and re-running picks up only the Games still
  unanalyzed.
- **Display**: the summary component (issue 02) renders the two non-completed outcomes with their
  own message, the failed one including what went wrong, so the Player has somewhere to start.
- **HP graft**: the HP budget is at 3/3, so no fourth suite. Graft the pass-completion
  confirmation onto **HP-01**'s existing analysis step (step 8) — the nominal completed outcome
  only; the failure and interruption paths stay in the lower tiers and in this FP.

## Acceptance criteria

- [ ] An engine failure during a pass records the `failed` outcome and the error message; nothing
      is swallowed into a log-only path.
- [ ] The failure message is shown to the Player, including what went wrong.
- [ ] A pass row left open is closed as `interrupted` when the job is constructed.
- [ ] Constructing the job **never** starts or resumes any engine work.
- [ ] An interrupted pass is reported as interrupted, never as completed.
- [ ] Evaluations already stored by an interrupted or failed pass are retained; the derived `done`
      reflects them.
- [ ] Re-running a pass covers only the Games still unanalyzed.
- [ ] The three outcomes are mutually exclusive and each has its own message on screen.
- [ ] `docs/test-scenarios/HP-01` carries the completion confirmation at its analysis step; no
      fourth HP suite is created.

### Feature Path (FP)

1. Start an analysis while the engine backend is unavailable → the app reports a failure **and**
   what failed, instead of behaving as though the pass ran.
2. Restart the app after cutting a pass off mid-run → the pass is reported as interrupted rather
   than completed, and the Positions already evaluated are still counted.
3. Observe that no analysis starts by itself on restart.
4. Start an analysis again → only the Games still unanalyzed are covered.

Verify: UI first; probe the store only to confirm retained Evaluations.

## Blocked by

`.scratch/analysis-pass-completion/issues/02-completion-summary-and-acknowledgement.md`
