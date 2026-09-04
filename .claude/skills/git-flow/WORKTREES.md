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

`.gitignore` declares `.claude/worktrees/`, and on **2026-09-04** a worktree was created there for
the first time and it works — the earlier ones on this machine all sat beside the repo as siblings,
which is why the symlink depths below had never been exercised. **US-39** stays open for the rest of
the mechanism (destruction, a stale worktree holding a merged branch, what happens when the sibling
whose `node_modules` you borrowed is deleted); this annex documents what is known to work.

**The story branch may already be checked out in the main checkout.** Then you are already isolated
— that checkout *is* this story's workspace — and adding a worktree would mean moving the branch.
Say which you chose and why; do not add a second workspace for the same branch.

## `node_modules`: three symlinks, because `npm install` is not available

A fresh worktree has **no** `node_modules`, and the repo root's install is not enough for the
client (`@vitejs/plugin-react` and `sass` live in `client/node_modules`). `npm install` is refused
by the permission classifier, so the way through is to borrow a sibling worktree's install — **three
links, because each workspace has its own tree**:

**The links are relative, so their depth depends on where the worktree sits.** Count it; do not
copy a path. From the declared home `.claude/worktrees/<name>/`, the sibling checkouts beside the
repo are **four** levels up (five from `client/` and `server/`):

```bash
# from .claude/worktrees/<name>/
ln -s ../../../../<sibling>/node_modules             node_modules
ln -s ../../../../../<sibling>/client/node_modules   client/node_modules
ln -s ../../../../../<sibling>/server/node_modules   server/node_modules
```

From a worktree that is itself a sibling of the repo, it is two levels less (`../<sibling>/…`,
`../../<sibling>/…`) — which is the form this recipe carried until 2026-09-04, when the first
worktree actually created at the declared location found it off by two. **Verify, don't trust**:

```bash
diff -q package.json ../<...>/package.json    # and the two workspace manifests
node -e "require.resolve('vitest')"           # resolves ⇒ the links are right
```

Do this **as the first step**, before running any test: without it every client test and the client
build fail at startup with `ERR_MODULE_NOT_FOUND`, which looks exactly like a code error and is not
one.

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

## Retiring a worktree — remove the symlinks first

`git worktree remove` refuses a worktree whose tree is dirty, and **the three `node_modules`
symlinks are untracked files**, so they count as dirt. Remove them, then the worktree, then the
branch — in that order (measured 2026-09-04, the first clean retirement at the declared location):

```bash
rm -f <wt>/node_modules <wt>/client/node_modules <wt>/server/node_modules
git worktree remove <wt>
git branch -d <branch>          # -d, never -D: it refuses if the branch is not merged
```

Keep `-d`. It is the check that the work actually landed somewhere, and it is the only thing
standing between "tidying up" and losing a branch. And remember the other direction, from the
`git-flow` *Cleanup* section: a **merged branch held by a worktree cannot be deleted**, and the fix
is to retire the worktree — which is not yours to do if the worktree is someone else's live
workspace.

## What you lose in a worktree, and what it is for

You lose the personal notes and the story history along with the traps — a real inconvenience, named
rather than hidden. In exchange, **a fresh worktree is exactly a fresh agent**: amnesiac by
construction. That is why it is the instrument that proves the method suffices, and why the memory
is deliberately not symlinked back (ADR-0028). Anything a fresh agent must know belongs in the
repo — this file exists because that rule was not being followed.
