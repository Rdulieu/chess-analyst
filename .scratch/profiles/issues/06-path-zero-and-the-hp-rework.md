# 06 — Path 0 and the HP rework

Status: `ready-for-human`

> **Implemented on the business-story integration branch `integration/US-11-profiles`.** Branch
> from it, PR back into it — **not** `develop`.
>
> **HITL.** This slice does **not** auto-merge. Which journeys survive, and what path 0 takes over
> from HP-01, are co-creation decisions with the human — not mechanical work.

> **Sequencing: hard blocker on US-13.** US-13 (stylesheet) will substantially rewrite these same
> three scenarios. This rework must be based on **US-13's version** of the HP files, never on
> today's. Rebase first, then write.

## Parent

`.scratch/profiles/PRD.md` — business story **US-11** (`BACKLOG.md`).

## What to build

The Happy Path suite no longer describes the app. All three HP begin by importing through a route
that no longer exists (`/import`, removed in slice 03), and none of them creates a Profile. This is
due work, not optional.

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

- [ ] A path 0 scenario exists under `docs/test-scenarios/`, in the suite's scenario format.
- [ ] Path 0 creates the `DudulSmash` Profile, imports the reference range against the real
      chess.com API, and produces a reusable database snapshot.
- [ ] HP-01, HP-02 and HP-03 restore that snapshot rather than importing again — except HP-01's own
      import assertions, which are its subject and stay.
- [ ] All three HP select a Profile before reading anything, and assert the banner names it.
- [ ] HP-01's import steps target the Profile's page; no scenario references the removed `/import`
      route.
- [ ] The suite README's inventory table and each scenario's `covers:` frontmatter are updated;
      path 0 is documented as a prerequisite, explicitly **outside** the 3-HP cap.
- [ ] The economy rules the README already states (no polling of harness-reported work, shortest
      Games for the pass, wait on conditions) survive the rewrite.
- [ ] The full suite is run and its result pasted into the `integration -> develop` PR, per the
      git-flow gate.

### Feature Path (FP)

Not applicable — this slice **is** the agentic suite. It is validated by running the reworked suite
itself at the `integration -> develop` gate (`/agentic-tests HP`), which is a human decision.

## Blocked by

- `.scratch/profiles/issues/05-the-analysis-pass-belongs-to-a-profile.md` — the last behavioural
  slice; the suite is rewritten against the finished feature.
- **US-13 (stylesheet)** — external, in another agent's worktree. Hard blocker: see the sequencing
  note above.
