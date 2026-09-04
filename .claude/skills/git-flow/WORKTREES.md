# Worktrees — one per story, and the three symlinks nobody guesses

Annex to the `git-flow` skill. Read it **before your first file change**, not after.

Everything here used to live in one agent's personal memory. That memory is indexed **by working
path**, so a worktree — another path, another project as far as the index is concerned — had **zero
entries**, and the first entry in it read *"worktree before any file change"*. The rule that sends
you into the worktree was filed in the one place the worktree cannot read, and every fresh agent
paid these traps again. ADR-0028 rules that the worktree is not repaired; the knowledge moves here
instead.

## Work in a dedicated worktree, not in the main checkout

**Several agents work on this repo at the same time.** Do not change a file until the current story
has its own worktree: concurrent sessions in one checkout clobber each other's working tree and
branch state. (Same reason the shared `git stash` stack is off limits: it is one stack for every
worktree.)

```bash
git fetch origin
git worktree add -b integration/<US>-<slug> .claude/worktrees/<US>-<slug> origin/develop
git -C .claude/worktrees/<US>-<slug> branch --unset-upstream
```

**Unset the upstream immediately.** `worktree add` from `origin/develop` sets `develop` as the new
branch's upstream, so a bare `git push` would target `develop` — the one branch the agent must
never push to.

`.gitignore` declares `.claude/worktrees/`, which is why that is the declared home. Note that no
live worktree has ever actually used it — the ones on this machine sit beside the repo as siblings.
**US-39** is open for the worktree mechanism itself (declared location vs. real, dependencies,
destruction); this annex documents what works today rather than settling that.

**The story branch may already be checked out in the main checkout.** Then you are already isolated
— that checkout *is* this story's workspace — and adding a worktree would mean moving the branch.
Say which you chose and why; do not add a second workspace for the same branch.

## `node_modules`: three symlinks, because `npm install` is not available

A fresh worktree has **no** `node_modules`, and the repo root's install is not enough for the
client (`@vitejs/plugin-react` and `sass` live in `client/node_modules`). `npm install` is refused
by the permission classifier, so the way through is to borrow a sibling worktree's install — **three
links, because each workspace has its own tree**:

```bash
ln -s ../<sibling>/node_modules            node_modules
ln -s ../../<sibling>/client/node_modules  client/node_modules
ln -s ../../<sibling>/server/node_modules  server/node_modules
```

Check the manifests match the sibling first (`diff -q` on the three `package.json` files). Do this
**as the first step**, before running any test: without it every client test and the client build
fail at startup with `ERR_MODULE_NOT_FOUND`, which looks exactly like a code error and is not one.

## Never `git add -A` in a worktree with symlinked deps

**The trap, and it reached `develop`.** `.gitignore` said `node_modules/`, and a **trailing slash
matches directories only** — a `node_modules` *symlink* is not a directory, so `git add -A` walked
straight past the rule and committed the links. `develop` then tracked `client/node_modules` and
`server/node_modules` as symlinks pointing at `../../US-11-profiles/…`: they resolved only from
inside a worktree, dangled from the main checkout, and **chained** (one worktree's link pointed
through another's), so deleting a worktree broke every checkout pointing through it. Vite then
refused to start from the main checkout with `Cannot find package '@vitejs/plugin-react'`, and every
merge of `develop` into a story branch re-dropped the pair.

Fixed by **PR #57** (`chore/untrack-node-modules-symlinks`) — dropping the slash covers both forms.
Two rules survive it:

- **Add explicit paths, never `-A`,** in a worktree whose deps are symlinked.
- If a checkout is already hit by it: `rm client/node_modules server/node_modules && npm install`
  once.

## One worktree per *state*, when you are comparing two commits

A worktree is not only per story. To compare what the screen says on two commits — the shape that
turned three "identity" Feature Paths into real evidence on 2026-09-04 — add a **second** worktree
at the base commit beside the feature one, run an app instance from each, and diff the readings. It
costs one `git worktree add` and three symlinks, and it produced 12 recaps compared byte for byte
and one Game's whole `<main>` character for character. The two instances need their own ports and
databases: see `agentic-tests/DRIVING.md §D0`.

## What you lose in a worktree, and what it is for

You lose the personal notes and the story history along with the traps — a real inconvenience, named
rather than hidden. In exchange, **a fresh worktree is exactly a fresh agent**: amnesiac by
construction. That is why it is the instrument that proves the method suffices, and why the memory
is deliberately not symlinked back (ADR-0028). Anything a fresh agent must know belongs in the
repo — this file exists because that rule was not being followed.
