# The factory's vocabulary

> **How the files in this directory are written**, because nothing said so and a fresh agent had to
> infer it from its siblings on 2026-09-04. They are in **English prose**, and strings quoted from
> the repo's own corpus — `BACKLOG.md` markers, status fields, French UI labels — stay **verbatim**,
> because an agent greps them byte for byte and the `L2` probe greps this directory. Lines wrap at
> **~100 columns**. Wrap by hand: an automated reflow duplicated list and blockquote markers
> (`- -`, `> >`) and corrupted a file on that same day.

The words the **method** uses for its own artifacts — not the chess domain's words, which live in
`CONTEXT.md` at the root. This file exists because the factory had no glossary of its own, and that
absence is how `done` drifted into a status field unopposed (ADR-0026).

It also carries the **correspondence table** of the 2026-09-04 upstream reprise, so a term that was
retired can still be recognised when it is met in an archive (ADR-0025).

## Correspondence table — what was renamed on 2026-09-04

Upstream renamed its whole vocabulary between `ea7e4afe` and `dcad289e`, and we followed it. Left
column: retired. Right column: current.

| Retired | Current | Note |
| --- | --- | --- |
| `issue` (our work item) | `ticket` | Not the platform's noun — see *What was **not** renamed* |
| `sub-issue` | `sub-ticket` | one ticket of a grilled story, implemented on its `integration/*` |
| `issue-ref` | `ticket-ref` | the `feature/<ticket-ref>-<slug>` branch segment |
| `PRD` | `spec` | the synthesis document of a story |
| `PRD.md` | `SPEC.md` | the file, for features started after 2026-09-04 |
| `.scratch/<feature>/issues/` | `.scratch/<feature>/tickets/` | likewise |
| `/to-prd` | `/to-spec` | skill, replaced upstream |
| `/to-issues` | `/to-tickets` | skill, replaced upstream |
| `UI-first` | `surface-first` | the agentic tier drives a **primary surface**, which here is the UI |

`done` is **not** in this table: it is kept, and requalified as a **delivery state** rather than a
sixth triage role (ADR-0026). The five canonical triage roles are unchanged and live in
`triage-labels.md`.

## What was **not** renamed, and why

- **`issue` as the platform's noun.** A GitHub or GitLab *Issue* object is called an issue, `gh
  issue list` is called that, and `issue-tracker.md` is the port's name. Upstream kept every one of
  these when it renamed the rest, and so do we: renaming them would break real commands and
  needlessly diverge from files we take verbatim. The rename applies to `issue` when it means **our
  work item**.
- **`PRD` when it names a document that exists under that name.** Roughly a dozen code comments
  read "(PRD)" or "the PRD says so" and point at `.scratch/<feature>/PRD.md`. Renaming those makes
  the pointer false. A reference to an archive keeps the archive's name.

## The legacy layout — features closed before 2026-09-04

The 33 features already under `.scratch/` use the previous layout, and **keep** it: the spec is
`PRD.md` and the tickets are in `issues/`. They are dated records; translating them into a
vocabulary that did not exist when they were written manufactures a false one. Their problem was
their *status field*, not their words, and that is what ADR-0026 corrected.

So when reading the technical backlog, expect both layouts, and do not "fix" the old one.

## The scope of the vocabulary probe

`/verify-factory` holds this table mechanically: it greps for the retired terms and fails, naming
the file, if one comes back. The probe searches **our own lines** — the files this repo writes or
has diverged — and states its exclusions rather than implying them:

**Searched**

```
CLAUDE.md
.claude/UPSTREAM.md
.claude/skills/agentic-tests/   .claude/skills/git-flow/
.claude/skills/assess-reading/  .claude/skills/profile-habits/   (+ every skill of our own making)
docs/agents/
docs/adr/
docs/test-scenarios/*.md
BACKLOG.md          (lines that are not blockquotes)
```

**Not searched, each for a stated reason**

| Excluded | Reason |
| --- | --- |
| `.scratch/**` | Dated technical-backlog records. Archives keep their period words. |
| `docs/factory-coherence-audit-2026-08-24.md` | A dated survey. Rewriting it would erase what it observed. |
| `docs/retrospectives/**`, `docs/feedback/**`, `docs/review/**` | Dated records, same reason. |
| `docs/adr/0025-*`, `docs/adr/0026-*`, this file, `verify-factory/SKILL.md` | The documents that **decide**, **explain** or **hold** the renaming must be able to name the retired terms. The probe matched its own definition on its first run; the blind spot is one file, and it is named. |
| Every other skill under `.claude/skills/` | Upstream-verbatim. A divergence there costs a hand-merge at the next reprise, and upstream's own `issue` uses are the platform noun kept above. Of the three that do carry local work, `agentic-tests` and `git-flow` are searched; `verify-factory` is the exception above. |
| `client/**`, `server/**`, `docs/test-scenarios/tools/**` | Code. Every occurrence is a pointer to a document named `PRD.md` (verified, 13 of them). This story has no code seam. |
| Blockquoted lines of `BACKLOG.md` | The dated grilling notes. All 63 occurrences sit there; the live prose has none. |

The exclusions are the interesting part of the probe: an exclusion that is not written down is
indistinguishable from an oversight.
