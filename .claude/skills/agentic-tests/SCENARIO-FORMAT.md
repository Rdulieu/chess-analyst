# Scenario format — agentic tests (HP / FP)

Reference format for the journeys driven by `/agentic-tests`. The layer's *concept* (the two
levels, the gates) is in `CLAUDE.md` (root). The runner is the `/agentic-tests` skill, which also
maps each system type to its **primary surface** and a recommended driver.

Two levels:

- **Happy Path** (`HP-`): curated, **permanent** suite, core value (paths taken by 80 %+ of
  users). Lives in `docs/test-scenarios/HP-*.md` (created at the first curation). Worth as much
  as **critical-path documentation** as it is a regression suite. Gate `integration -> develop`.
- **Feature Path** (`FP-`): **no file** here. It lives in the acceptance criteria of the
  technical-backlog tickets (see `/to-tickets`) and is **throwaway** — it dies with the
  ticket. If a piece of an FP is worth keeping, **graft it drive-by** onto an HP. Gate ticket
  `-> integration`.

## Vocabulary

| Term | Meaning |
|---|---|
| agentic test | the layer / pyramid tier |
| Happy Path (`HP-`) | curated, permanent suite, core value, gate integration→develop |
| Feature Path (`FP-`) | in-ticket journey, throwaway, gate ticket→integration |
| primary surface | how a real user reaches the system (UI, CLI, warehouse…) — driven first |
| drive-by | a feature validated while crossing the surface during an HP |
| finding | a signal raised at the end of a run, blocking or not |

Journeys strictly use the **domain terms** (see `CONTEXT.md` at the root).

## HP inventory

The inventory lives in `docs/test-scenarios/README.md`, created with the first HP. It names the
scenarios **and the prerequisite**, and the runner reads it rather than globbing `HP-*.md` — a glob
skips the prerequisite silently.

> **In this repo the inventory is prose, not a table, and that is deliberate.** The `covers:`
> frontmatter of each scenario is the **source of truth** for coverage; a table column repeating it
> would be a second one. What the README carries instead is what the files cannot say about
> themselves: why two former HPs were merged, why the freed slot went where it did, and why the
> prerequisite sits outside the cap. A duplication declared derived is not an incoherence; an
> undeclared one is.

**At most 3 HP.** The HP is the core value, not a catch-all. To add a 4th: merge two journeys,
drop a non-critical one, or graft drive-by onto an existing HP. Curation is a **human decision**,
at the integration→develop MR (see `git-flow`).

## The prerequisite — not an HP, and outside the cap

The suite has one scenario that is **not a journey**: it builds the state the others restore. It
is named `path-0-bootstrap.md`, its `id:` is `path-0`, and it is deliberately **not** `HP-` so the
cap is not spent on it and so a glob cannot mistake it for a journey. It follows the same skeleton
plus whatever it needs to justify the state it fabricates — in this repo, sections explaining why
there is a second and a third `Profile`, why it is not a Happy Path, the instrument that counts the
requests, and the figures recorded from the real APIs.

It runs **first, once per run**. A red prerequisite means the suite has **not** run.

## HP format

```md
---
id: HP-01
covers: [domain-term, domain-term]   # flows in CONTEXT.md language
---

# HP-01 — {Title}

## Goal
{1-2 business sentences — what is validated end-to-end.}

## Drive-by
- List of features validated along the way.

## Preconditions
- System running locally, reachable through its primary surface, clean data state.
  (Agnostic: no hard-coded ports / commands / tech.)

## Journey
1. {business action} → {what is observed}
2. …

## Checks
### Surface
- {what the primary surface must show/return after the action}

### Internals (optional)
- {only when the surface isn't enough — in natural language: store, logs, live state}

## Cleanup (best-effort)
- {nothing, or how to get back to a clean state}

## Notes
- {known pitfalls, false positives}
```

**The skeleton is the contract; the size is not.** The four scenarios in this repo run **166 to 349
lines**, and that is the shape they converged on rather than a drift to be tidied:

- **Preconditions carry figures**, not prose — which snapshot is restored, how many `Game`s, which
  `Profile`s and what each one is *for*. A scenario that does not know a third `Profile` is
  *supposed* to be empty reports it as a defect.
- **The Journey states what each step must observe**, per step, in domain terms — not just the
  action. That is what makes it executable by an agent who has never seen the app.
- **`## Checks` may carry more than two subsections.** Beyond `### Surface` and `### Internals`,
  a scenario that measures something names its **instrument** and records the **figures** it
  observed, dated, so the next run compares rather than re-derives.
- **`## Notes` is where a false positive goes to die.** Every driver quirk that once read as an app
  defect belongs there; it is the cheapest section in the file.

**No launch command, ever.** A scenario carries no ports, no commands, no tech — that property is
why this suite survived a complete change of pilot without a line moving. The pilot lives in
`agentic-tests/DRIVING.md`; a scenario that calls a helper is a script coupled to a pilot.

## Execution rules

Carried by the `/agentic-tests` runner:

- **Retry on different data** before raising a data-related finding.
- **Raise all findings**, blocking or not.
- **Surface-first**; probe internals only as a complement.
- **Independence**: an HP runs on its own, with no prerequisite from another.

## Adding / curating an HP

1. At the integration→develop MR, the agent runs the suite and **proposes** the curation.
2. Allocate the next free `HP-NN`, create the file under `docs/test-scenarios/`, follow the
   format, update the inventory — within the **max 3** limit.
3. Run the scenario once to confirm it is executable.
