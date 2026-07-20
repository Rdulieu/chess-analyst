# chess-analyst

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

This subagent step is the **baseline** — it leverages Claude Code subagents. Building richer
orchestrations on top (parallel/adversarial reviewers, several FPs, dedicated workflow tooling)
is encouraged.

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
