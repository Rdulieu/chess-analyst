# The factory is rebased on its upstream by a three-way merge, never by its installer

The factory came from [`Loulen/prompt-driven-software-factory`](https://github.com/Loulen/prompt-driven-software-factory),
installed here on 2026-07-20 (`bfe5c4a`) at upstream `ea7e4afe`. Eleven upstream commits later, the
two sides had diverged in **opposite directions**: upstream renamed its whole vocabulary
(`issue`→`ticket`, `PRD`→`spec`, `to-prd`/`to-issues` deleted in favour of `to-spec`/`to-tickets`),
recomposed its skills into thin shells over shared references, and added six of them; here,
`agentic-tests` grew from 78 to **833** lines of hard-won ground — the HP orchestrator, the
`min(3, floor(nproc/4))` ceiling paid for with three days of freezes, the lost-report recovery.

We decided to **follow upstream's renaming and its composition**, and to take the reprise as a
**three-way merge** rather than an install.

The base is not reconstructed, it is **proven**: six of our eight skills are byte-for-byte upstream
at `ea7e4afe`, and our untouched `tdd/SKILL.md` hashes to `85ac12eb…` — exactly upstream's file at
that ref. Only `agentic-tests` and `git-flow` carry local work. So git can merge `base → upstream`
onto our copy and **show, line by line, that nothing local was lost** — the requester's constraint
becomes verifiable instead of promised.

The merge is run in **two passes that are never mixed**:

1. **Structure**, mechanical and auditable — git merges the hunks. What lands, lands; the few
   conflicts are arbitrated by hand.
2. **Vocabulary**, lexical and repo-wide — an explicit correspondence table applied to everything,
   *including our own added lines*.

The second pass is not optional tidying: git merges **hunks**, and upstream's renaming lands on lines
that here were replaced or never existed. Our 833 lines say "sub-issue", "PRD", "UI-first", and no
merge will touch them. Structure alone yields a **half-renamed** file — the worst of both worlds, and
precisely the incoherence the coherence audit exists to remove.

## Considered options

- **Rerun `install.sh`.** Rejected: it proceeds by `cp -R "$_src/skills/$_s" "$_dest/$_s"` — whole
  directory, no comparison, no merge. It is the cause of the problem, not its cure. Only the
  `CLAUDE.md`/`AGENTS.md` blocks are handled gently (`write_block`); the skills are not.
- **Repair `skills-lock.json` and drive the reprise from it.** Rejected: the lock is not a guard-rail
  and does not tell the truth. `install.sh` neither writes nor reads it, and its hashes are not
  reproducible — `tdd`'s `computedHash` (`8986a01d…`) matches **neither** the install-time file nor
  today's upstream, while the file itself was identifiable by git without it. Git already is the
  lock, and git was not wrong.
- **Keep our vocabulary and cherry-pick upstream's ideas.** Rejected by the requester, who uses the
  new naming on another project and wants its philosophy. It also does not compose: the new
  `grill-with-docs` is a 20-line shell calling `grilling` + `domain-modeling`, the new `tdd` calls
  `codebase-design` and `code-review`, and `implement` orchestrates all three. Half the factory
  leaves calls dangling.

## Consequences

- **We adopt six skills we did not have** — `implement`, `verify-factory`, `code-review`,
  `codebase-design`, `clean-context`, `to-us` — because the new factory is *composed* and a partial
  adoption breaks its calls. Two of them settle work this repo had scoped for itself: `implement`
  codifies the "Dev workflow" paragraph `CLAUDE.md` writes by hand, and `verify-factory` is the
  mechanised hygiene the coherence audit asked for, already written.
- **`code-review` shadows Claude Code's built-in skill of the same name.** Accepted knowingly: the
  upstream one is bound to this repo's documented standards and to the originating ticket, and it is
  the one `implement` calls. The built-in `/code-review` is not used here.
- **The `build-factory` seeds get worse before they get better.** Upstream now ships six of them
  (`business-backlog.md`, `domain.md`, `triage-labels.md`, and three `issue-tracker-*` variants),
  twins of our `docs/agents/*.md` — the second source of truth already flagged by the audit (§1.5).
- **Delivered specs and closed `.scratch/` features are left as they are.** They are dated records;
  rewriting them into a vocabulary that did not exist when they were written manufactures a false
  one. Their problem is their *status*, not their words.
- **The deliverable is the means to do it again**, not this reprise: an `upstream` remote and the
  base recorded as a **git ref**, so the next question — what did upstream change, what did we
  change — is answered without re-reading 800 lines.
