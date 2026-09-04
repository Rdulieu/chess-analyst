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
- `integration/<business-ref>-<slug>`: integration branch for **one business user story**, from up-to-date `develop`. **Named after the business user story** (its reference + a slug), because `grill-with-docs` creates it during grilling — *before* `/to-spec` generates the spec on the technical backlog (so NOT the spec number). The session writes its grilling output (`CONTEXT.md`, ADRs) here; the integration branch then accumulates the story's sub-tickets. `ready-for-agent` sub-tickets **auto-merge** into it after a green local check (build + tests + lint + **green Feature Path (FP)**); `integration -> develop` stays a **human decision** (where the **HP** suite is run). **Deleted once it merges to `develop`** — see *Cleanup*.
- `feature/<ticket-ref>-<slug>`: one dev = one branch, from up-to-date `develop` — **or from the `integration/*`** of the business story when the dev implements a sub-ticket of a grilled story.
- `hotfix/<slug>`: from `main`, **on explicit request**, PR + manual validation, then ported back onto `develop`.
- **No `release` branch** until there's a pre-prod.

## Workflow

We speak of MR/PR (depending on the technical backlog, see `docs/agents/issue-tracker.md`). On the git side:

- **New dev**: from up-to-date `develop` -> `feature/<ticket-ref>-<slug>`; or, if the dev implements a sub-ticket of a grilled business story, from `integration/*` -> `feature/<ticket-ref>-<slug>`. Unless stated otherwise, it ties to one or more business stories (-> technical tickets); if none is known, ask.
- **Business story (integration branch)**: `grill-with-docs` creates `integration/<business-ref>-<slug>` from up-to-date `develop` (named after the business story, *before* `/to-spec`) and writes its grilling output there. `/to-spec` then creates the spec, then `/to-tickets` pushes the integration branch and creates the sub-tickets **based on it**. `ready-for-agent` sub-tickets PR -> `integration/*` and **auto-merge** once the **local check is green** (project build + tests + lint + the **FP** green via `/agentic-tests`, no blocking finding). Keep the integration branch in sync with `develop` (it is long-lived); once it merges to `develop`, **delete it** (see *Cleanup*).

  > No CI wired by default in the skeleton: the auto-merge gate is the agent running build + tests + lint **+ the FP** locally and merging only if everything is green. An agentic test needs an **agent** to drive the app: the day a CI exists, it doesn't run the test itself, it **triggers an agent** — and then it holds the gate.

  > **A check that cannot run has not passed.** `npm run lint` once returned 1 349 *parsing*
  > errors, not one of which was about the code — and it stayed that way, because nothing in
  > the gate ran it. Lint is green when the command **ran and exited 0**; a linter that cannot
  > parse the repo, or that reports zero problems because it linted zero files, is a **red**
  > gate. The same reading applies to the other three: an empty test run is not a green one.
- **End of dev**: PR toward the branch the dev started from (`--base develop`, or `--base <integration/*>` for a sub-ticket), comment the PR link on the business story (moved to "in review"). **The agent never merges into `develop`/`main`**: the responsible human validates and merges. *Only exception*: the auto-merge of a `ready-for-agent` sub-ticket into its `integration/*` (green local check).
- **`integration/*` -> `develop`**: human decision. Before the PR, the agent **runs the HP suite** (`/agentic-tests HP`) and **pastes the result** into the PR (pass/fail + findings); if the feature warrants it, it **proposes co-creating an HP** — **at most 3 HP** (otherwise: merge two journeys, drop a non-critical one, or graft drive-by). The PR **lists the included tickets** for a readable batch review. The agent opens the PR and gives the link; never merges. Once a human merges it, the integration branch is done — clean it up (see *Cleanup*).
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

## Cleanup — delete a merged integration branch

An `integration/*` branch is **throwaway**: it accumulates one story's sub-tickets, and once it
merges to `develop` its history is preserved there. Delete it then — a stale integration branch
invites new work onto a branch that is already merged.

- **Enable platform auto-delete.** Turn on "automatically delete head branches after merge" (GitHub
  repo setting) or set "delete source branch" as the MR default (GitLab), so the merge to `develop`
  removes the branch with no manual step.
- **Otherwise, the agent offers cleanup.** When it detects a **merged** `integration/*` branch, it
  proposes deleting the local and remote branch, and does so only after you approve. Guided, not
  gated: it offers, never forces (feature branches are out of scope here — this is about the
  long-lived integration branch).

Detect a merged integration branch, then delete after approval:

```bash
git branch --merged develop | grep 'integration/'      # local, already merged into develop
git branch -r --merged develop | grep 'integration/'   # remote counterpart
git branch -d <branch>                                 # delete local (after approval)
git push origin --delete <branch>                      # delete remote (after approval)
```

> **A branch checked out in a worktree cannot be deleted**, and `git branch -d` says so plainly
> (`used by worktree at ...`). That is not a reason to force it: the fix is to retire the worktree
> first, and a worktree may be another agent's live workspace. Report the branch as *held by a
> worktree*, name the path, and leave it — never `git worktree remove` someone else's directory to
> tidy a branch list. The 2026-09-04 cleanup hit exactly this on `integration/US-37-*`.

> **Not wired here, and that is why the drift went unseen.** GitHub's auto-delete is off on this
> repo and nothing offered the cleanup, so `git branch --merged develop` had grown to **9** live
> merged branches by 2026-09-04 — two of them `integration/*`. Deleting them is a **destructive,
> outward-facing** gesture on the remote: ask, then delete, and never assume an earlier approval
> covers the next batch.

## Before coding — check your position

On the 1st act of dev (code meant to be committed):

```bash
git rev-parse --abbrev-ref HEAD   # where am I?
git branch --merged develop       # already-merged branch = stale
git status -sb                    # upstream 'gone' = stale; clean tree?
```

On `main`, on a **stale** branch, or on a `feature/*` unrelated to the requested dev: don't pile on. Explain the cleanest placement (back to up-to-date `develop` + a new branch) and **why**, then ask for approval before acting (especially if there are uncommitted changes).
