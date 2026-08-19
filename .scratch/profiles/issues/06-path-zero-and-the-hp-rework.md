# 06 — Path 0 and the HP rework

Status: `done` — merged into `integration/US-11-profiles` (build + tests green; path 0 + HP-01/02/03 all green, 2026-08-19). The suite result is pasted into the integration→develop PR, which stays a human decision.

> **Implemented on the business-story integration branch `integration/US-11-profiles`.** Branch
> from it, PR back into it — **not** `develop`.
>
> **HITL.** This slice does **not** auto-merge. Which journeys survive, and what path 0 takes over
> from HP-01, are co-creation decisions with the human — not mechanical work.

> **Sequencing: unblocked.** US-13 landed in `develop` (PR #44/#49, 2026-08-17) and this branch is
> rebased on it. The stylesheet, the page skeleton and the token audit are now constraints on this
> slice, not a reason to wait — see the acceptance criteria.

## Parent

`.scratch/profiles/PRD.md` — business story **US-11** (`BACKLOG.md`).

## What to build

The Happy Path suite no longer describes the app. All three HP import from "Mes parties", where the
form no longer is (slice 03), and none of them creates a Profile. This is due work, not optional.

**What US-13 changed under this slice.** The suite was revised while this story was on hold, and it
grew a **theme pass** as the final step of each scenario — written once in
`docs/test-scenarios/theme-pass.md`, referenced three times, driven by
`docs/test-scenarios/tools/theme-audit.js`, and walking a **named inventory of six screens** in both
themes. Two consequences:

- **The inventory goes from six screens to eight.** No screen is removed — "Mes parties" stays, it
  merely loses the import form — and `/profiles` and `/profiles/:id` are added. The pass costs four
  more audits per scenario.
- **It is edited in one place.** `theme-pass.md` is the single source; do not copy assertions back
  into the scenarios. The rule that keeps the pass cheap — **no further Import and no further
  analysis**, it navigates and reads — must survive: the profiles screens are audited in whatever
  state the scenario left them, including empty.

**Path 0 — a bootstrap scenario.** One named, tested step that creates the `DudulSmash` Profile,
imports the reference range against the **real** chess.com API, and snapshots the database.
HP-01/02/03 then restore that snapshot by file copy instead of importing again. The suite README
already codifies snapshotting as an economy rule; path 0 turns a repeated instruction into a step
that is run once and verified once — the real chess.com contract gets exercised **once per suite
run** rather than once per scenario.

**It does not consume the 3-HP cap.** The cap protects against a sprawling suite of user journeys;
a shared state-building step is not a journey of value. HP-01 keeps what it is *for*: its own
real-network assertions — the per-month lines, the incremental re-import — stay with it. Path 0
builds state; it does not take over HP-01's subject.

**The three HP are then reworked** to pass through a Profile: the current Profile is selected
before anything is read, the banner names it, and the import assertions in HP-01 move to the
Profile's page. The README's inventory table and the per-scenario `covers:` frontmatter are updated
— `Profile` joins the covered terms.

## Acceptance criteria

- [x] A path 0 scenario exists under `docs/test-scenarios/`, in the suite's scenario format.
- [x] Path 0 creates the `DudulSmash` Profile, imports the reference range against the real
      chess.com API, and produces a reusable database snapshot.
- [x] HP-01, HP-02 and HP-03 restore that snapshot rather than importing again — except HP-01's own
      import assertions, which are its subject and stay.
- [x] All three HP select a Profile before reading anything, and assert the banner names it.
- [x] HP-01's import steps target the Profile's page; no scenario imports from "Mes parties".
- [x] `theme-pass.md`'s screen inventory covers **eight** screens including the two profiles
      screens, edited there and not copied into the scenarios.
- [x] The theme pass still triggers no Import and no analysis of its own.
- [x] The profiles screens pass the audit in both themes on all three scenarios — including the
      empty-state renderings, which are screens too.
- [x] The suite README's inventory table and each scenario's `covers:` frontmatter are updated;
      path 0 is documented as a prerequisite, explicitly **outside** the 3-HP cap.
- [x] The economy rules the README already states (no polling of harness-reported work, shortest
      Games for the pass, wait on conditions) survive the rewrite.
- [x] The full suite is run and its result pasted into the `integration -> develop` PR, per the
      git-flow gate.

### Feature Path (FP)

Not applicable — this slice **is** the agentic suite. It is validated by running the reworked suite
itself at the `integration -> develop` gate (`/agentic-tests HP`), which is a human decision.

## Blocked by

- `.scratch/profiles/issues/05-the-analysis-pass-belongs-to-a-profile.md` — the last behavioural
  slice; the suite is rewritten against the finished feature.
US-13 is no longer a blocker: it merged into `develop` (PR #44/#49) and this branch is rebased on
it.
