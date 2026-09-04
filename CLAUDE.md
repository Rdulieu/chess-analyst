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

Apex of the pyramid — above the end-to-end tests: the QA pass, done by an agent instead of a
human. A subagent validates the **real running system** through its **primary surface**,
**surface-first**, probing internals only when the surface isn't enough. Here the primary
surface is **the UI in a browser** and the driver is **our own CDP library** under
`docs/test-scenarios/tools/` (ADR-0020) — not the Playwright CLI upstream recommends; US-38 is
open to measure that trade. Two levels:

- **Happy Path (HP)**: curated suite (**at most 3 HP**), core value, under
  `docs/test-scenarios/`. Run + reported at the **integration→develop** MR (human decision).
- **Feature Path (FP)**: **executable** acceptance criteria of a sub-ticket (in the ticket
  body, **throwaway**). Sub-ticket→integration **auto-merge** gate: green FP + no blocking
  finding, on top of build + tests + **lint**.

Runner: `/agentic-tests`. Format & inventory: the `agentic-tests` skill's `SCENARIO-FORMAT.md`.

## The gate — stated once, here

A slice is done when, **together**: the project **builds**, the **test suite** is green, **`lint`
ran and exited 0**, the ticket's **Feature Path** is green, and **no blocking finding** is open.

Four checks and one judgement. Any other document that restates the gate — `git-flow`,
`/implement` — restates *this*; if one of them is shorter, this one wins. `lint` is the quarter
that goes missing: `npm run lint` once returned 1 349 *parsing* errors for four months because
nothing in the gate ran the command. **A check that cannot run has not passed** — an empty test
run and a linter that parses nothing are red, not green. And when a slice touches
`docs/test-scenarios/tools/`, "tests" is **two** commands: `npm test` *and* `npm run test:tools`.

## Dev workflow

**`/implement` is the entry point of a slice.** For a `ready-for-agent` ticket: branch per Git
flow, then run `/implement`, which loops three roles until the gate above holds — `/tdd` on the
lower pyramid tiers (red → green → refactor), an **independent** `/code-review` on the diff
against the ticket, and `/agentic-tests` on the ticket's Feature Path, a subagent driving the
running app. The review role is the one addition of the 2026-09-04 reprise that costs **per
ticket**: it exists so a drift from the ticket is seen before a full agentic pass discovers it.

In AFK the agent **chooses its seams and declares them** (ADR-0027) — `/tdd` asks for seam
approval, and nobody is there to give it. The seams chosen go into the PR; a seam chosen and not
declared is a review finding.

This subagent step is the **baseline** — it leverages Claude Code subagents. In **HP** mode the
runner goes further and is itself an orchestrator: the prerequisite first and alone, then **one
subagent per scenario in parallel**. The fan-out itself is cheap; **collecting** the reports is the
part that has actually failed — a whole green suite once went unreported — so the runner asks for
each report via `SendMessage` and, failing that, recovers it from the subagent transcripts. The
skill carries the details; do not improvise the dispatch.

Building richer orchestrations on top (adversarial reviewers, several FPs, dedicated workflow
tooling) is encouraged.

## The factory itself

The skills, seeds and method under `.claude/` come from
[`Loulen/prompt-driven-software-factory`](https://github.com/Loulen/prompt-driven-software-factory).
`.claude/UPSTREAM.md` records the base ref, the two commands that answer "what moved", and what is
deliberately refused. Three things follow from it and are worth knowing before you act:

- **`/build-factory` is not replayed here.** It is a bootstrap tool, this repo is bootstrapped, and
  its `CLAUDE.md` template has diverged from this file — it loses `lint` from the gate and has no
  "Dev phase". The replayable role is **`/verify-factory`**: run that to see where the factory
  stands. The skill file says the same thing at its top, where you would meet it.
- **Seeds flow one way.** `docs/agents/*.md` is this repo's source of truth; the
  `build-factory/*.md` seeds are templates for a *new* repo and are **never read here**.
- **`/code-review` is upstream's, not Claude Code's.** A project skill shadows the built-in one, on
  purpose: upstream's is bound to this repo's documented standards and to the originating ticket,
  and it is the one `/implement` calls.

## Git flow

Simplified vanilla git flow (`main`/`develop`/`integration/*`/`feature/*`/`hotfix/*`, no
`release` until pre-prod). Every Claude instance must know it:

@.claude/skills/git-flow/SKILL.md

## Agent skills

### Business backlog
User stories tracked in `BACKLOG.md` at the repo root (plain markdown, no external tool). See `docs/agents/business-backlog.md`.

### Technical backlog (issue tracker)
Tickets and specs live as markdown files under `.scratch/<feature-slug>/`. See
`docs/agents/issue-tracker.md`. The factory's own words — and the nine terms the 2026-09-04
upstream reprise retired — are in `docs/agents/vocabulary.md`.

### Triage labels
Default canonical role names, no mapping (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs
Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Factory health
`/verify-factory` — re-runnable, guided, never gating. Upstream's eleven checks plus four local
`L*` probes: the reprise is finished, no retired vocabulary came back, the `ready-for-agent` queue
is exact, and how far upstream has moved. Offline the two upstream-facing probes report **"not
verified"**, never red.
