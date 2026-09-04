---
name: agentic-tests
description: Runs the project's agentic tests — by default the current ticket's Feature Path (FP), or the full suite of Happy Paths (HP) when "HP"/"all" is requested or when on an integration branch with an open MR. In HP mode it orchestrates one subagent per scenario in parallel, and knows how their reports are delivered — and recovered when they are not. Use when running agentic tests, validating a ticket before auto-merge, or running the HP suite before an integration→develop PR.
---

# /agentic-tests — runner

Runs the **agentic test** layer (apex of the pyramid): a subagent drives the **real running
system** through its **primary surface** along a journey, **surface-first** — probing internals
only when the surface isn't enough. It sits **above end-to-end tests**: the QA pass, performed by
an agent instead of a human. In HP mode an orchestrator fans the suite out over **one subagent per
scenario** (§5). The *concept* (the two levels, the gates) is in `CLAUDE.md`; the *format* of
journeys is in [SCENARIO-FORMAT.md](./SCENARIO-FORMAT.md), and the HP inventory lives under
`docs/test-scenarios/` (created at the first HP curation). This skill only **executes**.

## Primary surface & driver

The **primary surface** is how a real user reaches the system. Drive it first; probe internals
(store, logs, live state) only when the surface can't show what a step needs. The driver stays
**agnostic** — pick it from the current stack. Upstream's generic table of surfaces and drivers is
kept in [DRIVING.md §D3](./DRIVING.md) for repos where the question is open. **Here it is settled,
so there is nothing to choose at runtime:**

> Primary surface: **the UI in a browser**. Driver: **our own CDP library** under
> `docs/test-scenarios/tools/` — call it, do not re-derive it
> ([DRIVING.md](./DRIVING.md)). Internals a step may fall back to: the SQLite database and the
> server log. Upstream's **Playwright row is deliberately not followed** — ADR-0020 (note of
> 2026-09-04) and **US-38**, open to *measure* the trade rather than argue it; reading that table
> as an instruction to migrate would undo US-38 before it runs.

## 1. Pick the mode

| Condition | Mode |
|---|---|
| argument `HP` / `all` (or equivalent) | **HP** — the whole suite |
| else, on an `integration/*` branch with an open integration→develop MR | **HP** |
| else (on a `feature/*`) | **FP** — the current ticket |

When ambiguous (on `develop`/`main`, no argument), ask which mode to run.

## 2. Shared prerequisites

- The **system runs locally** (start it the way the project expects; if you don't know how,
  ask). No running system = no execution.
- You can reach the **primary surface** with a driver — here, the CDP library of DRIVING.md §D2. No
  reachable surface = no execution.

## 3. FP mode (ticket → integration auto-merge gate)

1. Derive the ticket reference from the branch name `feature/<ticket-ref>-<slug>` and fetch the
   ticket from the technical backlog (see `docs/agents/issue-tracker.md`).
2. Read the **"Acceptance criteria → Feature Path (FP)"** section. It's a *behavioral*
   journey: translate it into concrete actions at runtime.
3. Run the journey against the system through its **primary surface** (probe internals only when
   the surface isn't enough).
4. Report: pass/fail per step **+ findings**.

**Gate**: the FP is one of its five parts. It is stated once, in `CLAUDE.md` — build, tests,
`lint` exited 0, a green FP, no blocking finding — and `git-flow` holds the auto-merge. On a red FP
or a blocking finding: **do not merge**, report.

> **A slice that touches `docs/test-scenarios/tools/` owes two test commands**, `npm test` *and*
> `npm run test:tools` (US-18, 2026-08-27). The library's suite sits outside `npm test` so the
> app's stays fast — which is how `theme-audit.js` went four months relied on by every theme pass
> and tested by nobody.

## 4. HP mode (integration → develop gate, human decision)

1. **Read the inventory in `docs/test-scenarios/README.md` first**, never a `HP-*.md` glob: it
   names the scenarios **and the prerequisite** the suite depends on, and the prerequisite is
   deliberately not named `HP-` (it is not a journey and does not count against the 3-HP cap). A
   glob skips it silently, and every scenario then fails on a precondition it was handed.
2. Run the prerequisite **first, once for the run** — `docs/test-scenarios/path-0-bootstrap.md`,
   which builds the reference `Profile` and the snapshots the scenarios restore. A red prerequisite
   means the suite has **not** run: report that, not three failed scenarios.
3. Run each journey **independently** — a shared snapshot restored into its **own** database file is
   a clean start; inheriting another scenario's live database is not. Dispatch **one subagent per
   scenario**, at the concurrency §5.1 derives.
4. Apply the **execution rules** (§6).
5. **Collect every report before concluding** (§5.2).
6. Produce a per-scenario report (pass/fail) + a consolidated **Findings** section, ready to
   paste into the integration→develop PR. Report the prerequisite's own result as its own line.
   **Paste the run ledger with it** — a gate that carries its own measurement shows a trend rather
   than an anecdote (`ORCHESTRATION.md §O6`, which also says how to read it without being misled).
7. **Audit §5 against what this run actually observed, and correct it** — §5.4. A run that leaves a
   stale warning standing makes every later run obey it.

The agent **never merges** into `develop`: it runs, reports, and proposes the HP curation
(see `git-flow`). HP red → the human decides.

## 5. Orchestration — one subagent per scenario, in parallel

The HP suite is run by an **orchestrator** that dispatches **one subagent per scenario** and
assembles their reports. The scenarios are independent by construction (each restores a snapshot
into its own database), so they parallelise cleanly, and a scenario's long tail — a real import, an
engine pass, thirty-six theme audits — overlaps with the others instead of being added to them.

**Two annexes carry the detail. Load them when you need them, not before:**

- [ORCHESTRATION.md](./ORCHESTRATION.md) — collecting reports, recovering a missing one, reading a
  subagent's state, what a fan-out costs, the self-audit log, and how to cost a pass afterwards.
- [DRIVING.md](./DRIVING.md) — starting the app, what a dispatch must pin, every trap the driver
  library encodes, and the library's own interface.

### 5.1 The shape of a run

1. **The prerequisite runs first, alone, to completion.** Path 0 builds the snapshots every
   scenario restores; dispatching the HPs before it has finished hands them a state that does not
   exist yet. It is the one step that is never parallel.
2. **Then the HPs, one subagent each — but not all at once.**

   ```
   concurrent agents = min(3, floor(nproc / 4))
   ```

   **Read `nproc` and derive it; never carry a number over from another machine.** On the 8-thread
   laptop this suite runs on that is **2** — run the third when a slot frees. **This is the only
   concurrency figure in the runner.** Do not "optimise" it by sharing the browser: pay it in
   serialisation, not in isolation. Why the divisor is 4, and the three days that set it:
   `ORCHESTRATION.md §O4`.
3. The orchestrator **collects each report the moment it arrives**, consolidates as it goes, and
   **stops the task once its report is in** — a finished subagent stays resident, can be woken for
   nothing long after the gate has shipped, and its transcript keeps growing, which corrupts any
   figure whose right edge is "the last line anybody wrote".

### 5.2 Collecting the reports

Delivery **works**, parallel fan-out included, and has across every suite since 2026-08-23. Expect
each report **twice** — once by the subagent's `SendMessage`, once as the completion notification;
**the second copy is not a second report**. An `idle_notification` says nothing about delivery.

1. **Act on the first arrival**, and consolidate as you go.
2. **Check what you already hold before relancing.** A relance costs a duplicate at best and a
   re-run of real engine and network time at worst.
3. **Ask only when a report is genuinely absent**, then recover it from the transcript
   (`ORCHESTRATION.md §O2`), then — last — re-run.
4. **Stop the task once its report is in.**

**An unreported scenario is an unrun scenario** until you have recovered its report. Never report a
scenario green on forensic evidence (row counts prove something ran; they say nothing about what the
screen said), and never report it dead on silence — a clean teardown looks exactly like a crash, and
"running · started 2d ago" is the **spawn** time, not elapsed work. `ORCHESTRATION.md §O3` has the
three signals that lie and what each one cost.

### 5.3 What to tell every subagent

Beyond its scenario and its ports:

- **The state it is handed**, with figures, and which parts of it are deliberate — a scenario that
  does not know a third Profile is *supposed* to be populated reports it as a defect.
- **Report truthfully**; say explicitly that an abridged step reported as green is worse than a red.
- **Re-measure before calling anything a defect** — read the live DOM again, not an earlier
  snapshot. Stale reads and driver quirks have produced more false findings on this suite than the
  app has produced real ones.
- **Partial beats silent.** If it cannot finish, it reports the part it did.


### 5.4 These instructions are provisional — verify them, and correct them

**This section is written ahead of its evidence, and it stays honest only if each run pays a few
minutes to re-check it.** So the next HP run carries a second job: audit the orchestration rules
against what it actually observes. Not as a chore at the end — as part of the run, because the run
is the only experiment that can settle any of it.

Answer these, and **write the answers down** in `ORCHESTRATION.md §O5`, which is the dated log of
every answer so far:

- **Did any report arrive on its own**, as a completion notification, with no prompting?
- **Did the `SendMessage`-on-idle relance work?** For how many agents?
- **Was transcript recovery needed at all?** If yes, was the path in `ORCHESTRATION.md §O2` still
  correct?
- **Do the isolation findings still hold** — the orphaned listener, the theme emulation, the shared
  browser stealing the selected page?
- **Did any driver produce a false finding?**

**Then correct the skill in the same run**, as a doc commit alongside the suite result. Three rules
for that edit:

- **Date every claim** you keep or add, so the next reader knows how old the evidence is.
- **Delete what has stopped being true.** A stale warning is worse than no warning: it is obeyed.
- **Do not state a mechanism you have not established.** Say what you observed and what you did
  about it — an early version of these rules asserted a confident cause the documentation
  contradicted; the observation was sound, the explanation invented. Report the symptom and the
  cure, and leave the cause open until something demonstrates it.

And the corollary that has bitten twice: **a story that withdraws a rule owes the permanent suite a
pass.** Grepping the suite for the withdrawn behaviour costs minutes; finding it costs a release.

## 6. Execution rules (agent)

- **Retry on different data before raising a data-related finding.** If a step fails on a
  particular instance, retry with another instance of the same kind; a "data" finding is only
  justified if **all** reasonable instances fail, or if the behavior is structural.
- **Raise all findings**, blocking or not (a warning, surprising behavior, side effect, real
  breakage). You **qualify the severity**; a blocking finding fails the gate.
- **Surface-first.** An internal probe only complements what the surface doesn't show, and only
  when that internal state exists.
- **Data selection by characteristics** (filters, badges, query predicates…), not hard-coded IDs
  (HP mode): if no data satisfies the conditions, that's a legitimate signal, not an excuse to
  bypass the surface.

## 7. Report format

For each journey: `✅ / ❌ <id or ticket> — <title>`, the failing steps, then:

```
## Findings
- [blocking] …
- [non-blocking] …
```

In HP mode the orchestrator consolidates one line per scenario — the prerequisite included, as its
own line — then merges the findings, de-duplicating what several scenarios saw. Findings about the
**run** (driver quirks, teardown, parallelism) are worth keeping, but label them as such: they are
not findings about the app, and a reviewer must not have to work out which is which.

## 8. Dispatch checklist

Before sending a scenario to a subagent, confirm its prompt carries all eight. The first is the
one that silently loses runs.

- [ ] **Deliver the report via `SendMessage`** on completion. Collect on the first copy; the second
      is not a second report (§5.2)
- [ ] Its own server, client and CDP ports, its own `DB_FILE`, and **its own private browser** — not
      the shared one (`DRIVING.md §D1`, where the page thefts are)
- [ ] **Concurrency derived from the machine**, `min(3, floor(nproc / 4))` — §5.1. Never carry a
      number over from another host
- [ ] **Drive with the library**, not with a script re-derived on the spot (`DRIVING.md §D2`).
      Restore-before-start, the `location.port` guard and teardown down to the grandchild are all
      inside those calls, with their evidence — they are not a recipe to retype
- [ ] The state it is handed, with figures, and what about it is deliberate
- [ ] Re-measure before calling anything a defect; partial beats silent
- [ ] A truthful red beats an optimistic green; an abridged step reported as green is worse than a red

**After the run**, in order: no report ⇒ ask via `SendMessage` ⇒ still nothing ⇒ recover from the
transcript (`ORCHESTRATION.md §O2`) — only then is a scenario genuinely unrun. Then **stop the
tasks**, **cost the run** (`ORCHESTRATION.md §O6`), and **audit §5** against what you saw (§5.4).
