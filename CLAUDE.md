# chess-analyst

## Dev phase (current)

We are still pre-prod and local-only (ADR-0002), but the local data is **no longer throwaway**:
the database holds analyzed Games whose `Evaluation`s only engine time can rebuild (ADR-0015).
Two standing rules, one kept and one withdrawn:

- **Reworking the DB schema is fair game.** Unchanged. Don't shy away from a design decision
  because it changes the SQLite schema; pick the cleanest model, not the one that avoids
  touching the schema.
- **But every schema change owes a migration.** ~~Wiping the local DB and re-importing is an
  acceptable step~~ — **withdrawn** (ADR-0015). Import rebuilds Games cheaply; **nothing rebuilds
  Evaluations**. A schema change ships with its migration script, in the same slice: non-
  destructive, re-runnable, failing loudly rather than leaving rows half-assigned (nullable
  column -> backfill -> `NOT NULL`, the tightening acting as the assertion). Re-importing Games
  is still fine to *add* or *refresh* Games; it is the **wipe** that is retired. "Wipe and
  re-import" is data loss and must be named as such.

Revisit these rules once there is a pre-prod.

## Agentic tests (concept)

Apex of the pyramid: a subagent validates the **real running app** through tech-agnostic
scenarios, **UI-first**. Two levels:

- **Happy Path (HP)**: curated suite (**at most 3 HP**), core value, under
  `docs/test-scenarios/`. Run + reported at the **integration→develop** MR (human decision).
- **Feature Path (FP)**: **executable** acceptance criteria of a sub-issue (in the issue
  body, **throwaway**). Sub-issue→integration **auto-merge** gate: green FP + no blocking
  finding, on top of build + tests.

Runner: `/agentic-tests`. Format & inventory: the `agentic-tests` skill's `SCENARIO-FORMAT.md`.

## Dev workflow

For a `ready-for-agent` issue: branch per Git flow, then implement with `/tdd`
(red → green → refactor) on the lower pyramid tiers. **After a `/tdd` implementation, propose
to the user to spawn a subagent that runs `/agentic-tests`** on the issue's Feature Path — the
subagent drives the running app (UI-first) and reports findings, so validation is an actual
step, not just a suggestion. Iterate `/tdd` ↔ `/agentic-tests` until build + tests + FP are
green with no blocking finding, then merge per Git flow.

This subagent step is the **baseline** — it leverages Claude Code subagents. In **HP** mode the
runner goes further and is itself an orchestrator: the prerequisite first and alone, then **one
subagent per scenario in parallel**. That fan-out has one contract that is easy to get wrong and
expensive to get wrong — a subagent's final message does **not** reach the orchestrator, only a
`SendMessage` does, and a report that never arrives is recoverable from the subagent transcripts.
The skill carries the details; do not improvise the dispatch.

Building richer orchestrations on top (adversarial reviewers, several FPs, dedicated workflow
tooling) is encouraged.

## Git flow

Simplified vanilla git flow (`main`/`develop`/`integration/*`/`feature/*`/`hotfix/*`, no
`release` until pre-prod). Every Claude instance must know it:

@.claude/skills/git-flow/SKILL.md

## Agent skills

### Business backlog
User stories tracked in `BACKLOG.md` at the repo root (plain markdown, no external tool). See `docs/agents/business-backlog.md`.

### Technical backlog (issue tracker)
Issues and PRDs live as markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels
Default canonical role names, no mapping (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs
Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
