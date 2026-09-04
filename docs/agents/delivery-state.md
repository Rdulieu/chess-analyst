# The delivery state — and what the queue actually is

The triage state machine has **five** canonical roles (`triage-labels.md`), and no terminal one.
Practice invented one anyway: dozens of tickets under `.scratch/` read `Status: done`, a word that
appears in no role list. This file says what that word is, and makes the queue computable.

**`done` is kept, and it is not a sixth triage role. It is a delivery state, on a different axis.**
ADR-0026.

## Why two axes, not six roles

The five roles all answer *what should happen to this next* — sort it, question it, give it to an
agent, give it to a human, bury it. `done` answers *what happened*. They share one `Status:` field
without contradicting each other because **they exclude each other in time**: a delivered ticket has
left the triage machine.

Adding a sixth canonical role was rejected. It would reopen the divergence with upstream on the very
file that is our contact point with it (`triage-labels.md`, which upstream still ships with five
roles and no terminal state), and it would model a journal entry as a state in a machine whose every
other state is actionable. **The roles table stays untouched**; this divergence is small and
additive — upstream can add a terminal state tomorrow without breaking us.

## The queue, mechanically

> **The `ready-for-agent` queue = tickets carrying `ready-for-agent` and not the delivery state.
> Specs are not in it, by definition.**

Both clauses were needed, and the second one only became obvious once the queue was counted. On
2026-09-04 it held **53 entries and not one real one**:

- **19 specs carried `Status: ready-for-agent`.** A spec is not a work item: it enters no queue and
  will never be delivered, because it is not the thing delivered. **Only tickets are queue items** —
  19 entries gone with no file touched.
- **34 tickets of delivered features still read `ready-for-agent`.** No definition rescues those:
  the file stated something false. They were corrected once, mechanically, on 2026-09-04.

`/verify-factory`'s probe **L3** publishes the count, so the definition is checked rather than
believed.

## What a new `done` owes — date, coordinates, gate

**The word proves nothing by itself**; it says an agent typed it. What proves a ticket finished is
the **gate** (`CLAUDE.md`): build, tests, `lint` exited 0, a green Feature Path, no blocking
finding — and a merge commit. So the rule tightens **forward only**. A ticket delivered from
2026-09-04 onward carries, right under its status:

```
Status: done
Delivered: <YYYY-MM-DD> · merge `<sha>` or PR #<n> · gate: <result>, no blocking finding
```

That is what makes the **auto-merge gate auditable after the fact**: an agent merged a
`ready-for-agent` ticket into its `integration/*` with no human in the loop, and this line is the
only place that says on what evidence.

**Marking a new ticket delivered without its coordinates is not allowed.** A `done` with no date,
no merge reference and no gate result is exactly the state this file exists to end — it is a claim,
not a record. If the gate did not fully run, say which part did not and why, in that line. A
declared partial gate is auditable; a bare `done` is not.

## The retroactive gap — named, not repaid

**The old `done` tickets do not carry their coordinates, and they will not.** Of the tickets already
marked delivered before 2026-09-04, seventeen carry a gloss in the status line (branch, date, gate
result) and **twenty-three read exactly `Status: done` and nothing else**. Building a delivery line
for those means reconstructing dates and merge commits from git, ticket by ticket — an
investigation, not a mechanical pass, and one that would write **guessed dates into archives**.

Likewise, the 34 tickets corrected on 2026-09-04 got **one stale word in a status field** replaced,
on files whose delivery is proven by the business backlog. Their content was not rewritten and **no
delivery coordinates were invented**.

So: when asked whether an old ticket was delivered properly, **the absence is stated, not guessed**.
That is a fact of the history, not a debt.

## A feature is closed when all its tickets are delivered

One level up, and for free: a `.scratch/<feature>/` directory is **closed** when every ticket in it
carries the delivery state. That is the closure `.scratch/` never had.
