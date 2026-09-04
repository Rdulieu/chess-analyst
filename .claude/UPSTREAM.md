# Where the factory comes from, and how to take the next reprise

The skills, the seeds and the method under `.claude/` are not ours by origin. They come from
[`Loulen/prompt-driven-software-factory`](https://github.com/Loulen/prompt-driven-software-factory)
and they have been adapted here. This file exists so that the next reprise costs **two commands**
instead of half a day of archaeology, and so that the base of the next merge is a **fact** rather
than a reconstruction.

Read ADR-0025 for why the reprise is a three-way merge and never an install.

## The base

| | |
| --- | --- |
| Upstream repo | `https://github.com/Loulen/prompt-driven-software-factory` |
| Upstream subdirectory | `skills/` — ours is `.claude/skills/` |
| **Reprise ref (base of the next merge)** | **`dcad289e`** — `clean-context update`, 2026-09-02 |
| Reprised here on | 2026-09-04, on `integration/US-21-US-25-factory-update` |
| Previous base | `ea7e4afe`, 2026-06-29 — installed here 2026-07-20, commit `bfe5c4a` |

The ref is **proven, not remembered**. At the previous base, six of the eight installed skills were
byte-for-byte upstream at `ea7e4afe`; only `agentic-tests` and `git-flow` carried local work. That
is what let the 2026-09-04 reprise show, line by line, that the merge lost nothing local — the
proof is in `.scratch/factory-update/proof-03-nothing-local-lost.md`. Keep the habit: the second
command below is what makes the next one as cheap.

> When a reprise lands, **this ref moves** to the upstream commit that was merged. A stale ref here
> makes both commands below lie, and makes `/verify-factory`'s "reprise is finished" probe lie with
> them.

## The remote

The upstream repo is a remote, restricted to its default branch and fetching no tags — it weighs
1.1 MB against our 59 MB of `.git`, and `git branch -r` is long enough already. Nothing fetches it
automatically; asking upstream what it did is an explicit gesture.

```bash
git remote add -t main --no-tags upstream https://github.com/Loulen/prompt-driven-software-factory.git
git fetch upstream
```

HTTPS on purpose: the repo is public and read-only for us, so it needs none of this repo's SSH
identity.

## The two commands

**What did upstream change since our base?**

```bash
git fetch upstream
git diff --name-only dcad289e upstream/main -- skills/
```

Empty means the reprise is finished. A list of files means upstream has moved and a reprise is a
decision to take. How far it has moved:

```bash
git rev-list --count dcad289e..upstream/main
```

**What did we change since our base?** — the one that protects our customisations. `git diff` cannot
answer it directly: upstream keeps its skills in `skills/` and we keep ours in `.claude/skills/`, so
the paths never line up. Extract the base and compare directories:

```bash
tmp=$(mktemp -d) && git archive dcad289e skills | tar -x -C "$tmp" --strip-components=1
diff -rq "$tmp" .claude/skills; rm -rf "$tmp"
```

Files reported as differing are ours to merge **by hand**; anything reported as `Only in
.claude/skills` is a skill of this repo's own making, not the factory's.

No `git subtree`. The directories do not line up, so it would need a filtered branch — machinery to
replace two commands — and subtree *merges*, when the whole lesson of ADR-0025 is that a mechanical
merge is never enough here.

## What diverges locally, on purpose

The two commands above answer "what did we change" mechanically. This is the *why*, so the next
reprise arbitrates instead of guessing. Only these files carry local work; everything else under
`.claude/skills/` is upstream verbatim and can be taken wholesale.

| File | Local work it carries |
| --- | --- |
| `agentic-tests/SKILL.md` | The HP orchestrator (§5): the `min(3, floor(nproc/4))` fan-out ceiling, lost-report recovery, the isolation kit, the self-audit mechanism, the driver library and the run-costing method. 78 lines upstream, ~860 here. |
| `git-flow/SKILL.md` | "After opening a PR — check it is still mergeable", the "A check that cannot run has not passed" box, and the local reading of `BACKLOG.md` conflicts. |
| `verify-factory/SKILL.md` | The four local `L*` probes (reprise finished, vocabulary, exact queue, upstream ahead) and the §8 instantiation that refuses the Playwright row. |
| `build-factory/SKILL.md` | A ⛔ banner at the top: not replayed here, and why (its `CLAUDE.md` template regresses the gate). The rest is upstream verbatim. |
| `implement/SKILL.md` | `lint` added to the green gate, in two places. Upstream states it as "build + tests"; here the gate is stated once in `CLAUDE.md` and includes lint. |

`assess-reading` is this repo's own skill and was never the factory's — it is not part of any
reprise.

**`code-review` shadows Claude Code's built-in skill of the same name.** A project skill overrides
the built-in one, so `/code-review` here is upstream's: bound to this repo's documented standards
and to the originating ticket, and it is the one `implement` calls. Claude Code's built-in
`/code-review` is not reachable in this repo, and that is intended, not an accident — ADR-0025. The
skill file itself is left **upstream-verbatim** so it needs no hand-merge next time; the note lives
here and in `CLAUDE.md`, which every agent reads anyway.

## What is refused, and why

Three upstream gestures are deliberately not taken. They are written here rather than left implicit,
so that a fresh agent does not helpfully "fix" them.

- **`install.sh` is never rerun.** It proceeds by `cp -R` on whole skill directories — no
  comparison, no merge. Rerunning it would overwrite `agentic-tests`, which has grown from 78 to
  833 lines of ground paid for in freezes and lost reports. It is the cause of the problem, not the
  cure. ADR-0025.
- **`skills-lock.json` is deleted, not repaired.** Its hashes were not reproducible: `tdd` was never
  touched here and hashes to exactly upstream's file at `ea7e4afe`, while the lock announced
  something else. The installer neither writes nor reads it. A lock that lies is worse than no lock,
  because it invites trust. Git already is the lock, and git was not wrong. ADR-0025.
- **Upstream's driver recommendation (the Playwright CLI) is not followed.** We take the
  `surface-first` concept and the sentence that finally situates the tier, and we keep our own CDP
  driver library. See the 2026-09-04 note on ADR-0020; **US-38** is open to measure the trade rather
  than argue it.

And one gesture that is refused in the other direction: **`/build-factory` is not rerun in this
repo.** See its skill file and ADR-0025 — it is a bootstrap tool, this repo is bootstrapped, and
`/verify-factory` holds the replayable role.
