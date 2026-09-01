---
name: git-flow
description: Project git flow (branches, PR/MR, position check before dev). Use when starting or finishing a dev, branching, opening a PR/MR, merging, or to know which branch to work from.
---

# Git flow

Simplified vanilla git flow. This documents *project* usage, not git itself.
Business / technical backlogs: see `docs/agents/business-backlog.md` and
`docs/agents/issue-tracker.md` (source of truth for the tooling).

## What we keep

- `main`: prod, **protected**; no direct merge (hotfix excepted).
- `develop`: global integration; every dev branches from it and merges back into it.
- `integration/<business-ref>-<slug>`: integration branch for **one business user story**, from up-to-date `develop`. **Named after the business user story** (its reference + a slug), because `grill-with-docs` creates it during grilling — *before* `/to-prd` generates the PRD on the technical backlog (so NOT the PRD number). The session writes its grilling output (`CONTEXT.md`, ADRs) here; the integration branch then accumulates the sub-issues. `ready-for-agent` sub-issues **auto-merge** into it after a green local check (build + tests + lint + **green Feature Path (FP)**); `integration -> develop` stays a **human decision** (where the **HP** suite is run).
- `feature/<issue-ref>-<slug>`: one dev = one branch, from up-to-date `develop` — **or from the `integration/*`** of the business story when the dev implements a sub-issue of a grilled story.
- `hotfix/<slug>`: from `main`, **on explicit request**, PR + manual validation, then ported back onto `develop`.
- **No `release` branch** until there's a pre-prod.

## Workflow

We speak of MR/PR (depending on the technical backlog, see `docs/agents/issue-tracker.md`). On the git side:

- **New dev**: from up-to-date `develop` -> `feature/<issue-ref>-<slug>`; or, if the dev implements a sub-issue of a grilled business story, from `integration/*` -> `feature/<issue-ref>-<slug>`. Unless stated otherwise, it ties to one or more business stories (-> technical issues); if none is known, ask.
- **Business story (integration branch)**: `grill-with-docs` creates `integration/<business-ref>-<slug>` from up-to-date `develop` (named after the business story, *before* `/to-prd`) and writes its grilling output there. `/to-prd` then creates the PRD, then `/to-issues` pushes the integration branch and creates the sub-issues **based on it**. `ready-for-agent` sub-issues PR -> `integration/*` and **auto-merge** once the **local check is green** (project build + tests + lint + the **FP** green via `/agentic-tests`, no blocking finding). Keep the integration branch in sync with `develop` (it is long-lived).

  > No CI wired by default in the skeleton: the auto-merge gate is the agent running build + tests + lint **+ the FP** locally and merging only if everything is green. An agentic test needs an **agent** to drive the app: the day a CI exists, it doesn't run the test itself, it **triggers an agent** — and then it holds the gate.

  > **A check that cannot run has not passed.** `npm run lint` once returned 1 349 *parsing*
  > errors, not one of which was about the code — and it stayed that way, because nothing in
  > the gate ran it. Lint is green when the command **ran and exited 0**; a linter that cannot
  > parse the repo, or that reports zero problems because it linted zero files, is a **red**
  > gate. The same reading applies to the other three: an empty test run is not a green one.
- **End of dev**: PR toward the branch the dev started from (`--base develop`, or `--base <integration/*>` for a sub-issue), assigning the **responsible reviewer** (`<reviewer to define>`); comment the PR link on the business story (moved to "in review"). **The agent never merges into `develop`/`main`**: the responsible human validates and merges. *Only exception*: the auto-merge of a `ready-for-agent` sub-issue into its `integration/*` (green local check).
- **`integration/*` -> `develop`**: human decision. Before the PR, the agent **runs the HP suite** (`/agentic-tests HP`) and **pastes the result** into the PR (pass/fail + findings); if the feature warrants it, it **proposes co-creating an HP** — **at most 3 HP** (otherwise: merge two journeys, drop a non-critical one, or graft drive-by). The PR **lists the included issues** for a readable batch review. The agent opens the PR and gives the link; never merges.
- **`develop` -> `main`**: human decision. On request, the agent opens the PR and gives the link; never merges.

## After opening a PR — check it is still mergeable

**Opening the PR is not the end of the job.** `develop` moves while you work, and a PR that was
clean at creation can be `CONFLICTING` minutes later. Before handing back to the human, **re-check
the PR's mergeability** — and re-check it again if time passed between the last check and the
hand-off. Handing over a conflicted PR without saying so wastes the reviewer's first move.

`BACKLOG.md` is the usual culprit, and structurally so: **every** story transition rewrites the same
region (the `## To do` / `## Doing` / `## In review` / `## Done` boundaries), so two stories in
flight collide there almost by construction. Expect it rather than being surprised by it.

**Who resolves what:**

- **The conflict opposes no decision -> the agent resolves it, in autonomy, before handing back.**
  That is the case when both sides' intentions **compose** and only their placement collides: one
  side moved a section heading while the other inserted an entry, two stories were added to
  different sections, a story moved to `Done` while another moved to `In review`. Keep both
  intentions, order them correctly, verify nothing else was lost (the rest of the file usually
  auto-merged — read it, do not assume), re-run build + tests + lint, push, and **state in the hand-off
  what was resolved and why it opposed nothing**.
- **The conflict opposes decisions -> stop and hand back to the human**, with the analysis: what
  each side asserts, and why they cannot both hold. That is the case when the two sides give the
  same story contradictory statuses or contents, when one deletes what the other edits, or when
  resolving would mean choosing between two intents. Do not pick for the human.

The dividing line is not the file, nor the size of the diff: it is whether resolving requires a
**decision**. Re-ordering two compatible insertions requires none. Choosing which of two truths
about a story survives requires one.

> If the same file keeps colliding release after release, say so — a recurring conflict is a signal
> about how the file is organised, not a fatality of git. Report the pattern; do not restructure the
> backlog on your own initiative.

## Before coding — check your position

On the 1st act of dev (code meant to be committed):

```bash
git rev-parse --abbrev-ref HEAD   # where am I?
git branch --merged develop       # already-merged branch = stale
git status -sb                    # upstream 'gone' = stale; clean tree?
```

On `main`, on a **stale** branch, or on a `feature/*` unrelated to the requested dev: don't pile on. Explain the cleanest placement (back to up-to-date `develop` + a new branch) and **why**, then ask for approval before acting (especially if there are uncommitted changes).
