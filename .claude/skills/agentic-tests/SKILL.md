---
name: agentic-tests
description: Runs the project's agentic tests — by default the current sub-issue's Feature Path (FP), or the full suite of Happy Paths (HP) when "HP"/"all" is requested or when on an integration branch with an open MR. In HP mode it orchestrates one subagent per scenario in parallel, and knows how their reports are delivered — and recovered when they are not. Use when running agentic tests, validating a sub-issue before auto-merge, or running the HP suite before an integration→develop PR.
---

# /agentic-tests — runner

Runs the **agentic test** layer (apex of the pyramid): a subagent drives the **real running
app** and validates a journey, **UI-first**. In HP mode an orchestrator fans the suite out over
**one subagent per scenario** (§5). The *concept* (the two levels, the gates) is in
`CLAUDE.md`; the *format* of journeys is in [SCENARIO-FORMAT.md](./SCENARIO-FORMAT.md), and the
HP inventory lives under `docs/test-scenarios/` (created at the first HP curation). This skill
only **executes**.

> Tech-agnostic: pick your driver (browser or other) based on the current stack. Assume no
> framework, no ports, no seeding tool.

## 1. Pick the mode

| Condition | Mode |
|---|---|
| argument `HP` / `all` (or equivalent) | **HP** — the whole suite |
| else, on an `integration/*` branch with an open integration→develop MR | **HP** |
| else (on a `feature/*`) | **FP** — the current sub-issue |

When ambiguous (on `develop`/`main`, no argument), ask which mode to run.

## 2. Shared prerequisites

- The **app runs locally** (start it the way the project expects; if you don't know how,
  ask). No running stack = no execution.
- You know how to drive the app (driver of your choice).

## 3. FP mode (sub-issue → integration auto-merge gate)

1. Derive the issue reference from the branch name `feature/<issue-ref>-<slug>` and fetch the
   issue from the technical backlog (see `docs/agents/issue-tracker.md`).
2. Read the **"Acceptance criteria → Feature Path (FP)"** section. It's a *behavioral*
   journey: translate it into concrete actions at runtime.
3. Run the journey against the app, UI-first (probe the backing store only if one exists and
   the UI is not enough).
4. Report: pass/fail per step **+ findings**.

**Gate** (see `git-flow`): auto-merge only happens if the FP is **green** *and* no **blocking
finding** is raised — on top of green build + tests. On red or a blocking finding: **do not
merge**, report.

## 4. HP mode (integration → develop gate, human decision)

1. Read the inventory in `docs/test-scenarios/README.md` first: it names the scenarios **and any
   prerequisite step** the suite depends on. Do not glob for `HP-*.md` alone — a prerequisite is
   deliberately not named `HP-` (it is not a journey and does not count against the 3-HP cap), so a
   glob silently skips it and every scenario then fails on a precondition it was handed.
2. Run the prerequisite(s) **first, once for the run** — currently
   `docs/test-scenarios/path-0-bootstrap.md`, which builds the reference `Profile` and the database
   snapshots the scenarios restore. A red prerequisite means the suite has **not** run: report it as
   such rather than reporting three failed scenarios.
3. Read all `docs/test-scenarios/HP-*.md` and run each journey **independently** against the app (an
   HP must run on its own — restoring a shared snapshot into its **own** database file is a clean
   start; inheriting another scenario's live database is not). Dispatch **one subagent per
   scenario, in parallel** — see [§5 Orchestration](#5-orchestration--one-subagent-per-scenario-in-parallel),
   whose delivery contract is not optional: a report that is not `SendMessage`d never arrives.
4. Apply the **execution rules** (§6).
5. **Collect every report before concluding.** A scenario that has not reported has not run — but
   recover it from the transcripts (§5.2) before treating it as lost or re-running it.
6. Produce a per-scenario report (pass/fail) + a consolidated **Findings** section, ready to
   paste into the integration→develop PR. Report the prerequisite's own result as its own line.

The agent **never merges** into `develop`: it runs, reports, and proposes the HP curation
(see `git-flow`). HP red → the human decides.

## 5. Orchestration — one subagent per scenario, in parallel

The HP suite is run by an **orchestrator** that dispatches **one subagent per scenario** and
assembles their reports. This is the intended shape: the scenarios are independent by
construction (each restores a snapshot into its own database), so they parallelise cleanly, and
a scenario's long tail — a real import, an engine pass, sixteen theme audits — overlaps with the
others instead of being added to them.

**Shape of a run:**

1. **The prerequisite runs first, alone, to completion.** Path 0 builds the snapshots every
   scenario restores; dispatching the HPs before it has finished hands them a state that does not
   exist yet. It is the one step that is never parallel.
2. **Then all HPs at once**, one subagent each.
3. The orchestrator **collects the reports** (see the delivery contract below) and consolidates.

### 5.1 The delivery contract — read this before dispatching anything

**A named background subagent's final message does NOT reach the orchestrator.** Its plain text
output goes nowhere the parent can see. **Only an explicit `SendMessage` back to the orchestrator
delivers anything.**

This is the single failure that costs whole runs. Measured on 2026-08-21: four scenarios each ran
to completion and wrote full, detailed reports; **none arrived**. Only the one that happened to
answer a follow-up via `SendMessage` was ever heard. Roughly thirty minutes of real-API work,
green, invisible.

It was made worse by the dispatch prompt itself, which told every agent *"your final message is
the ONLY thing I see"* — true of a synchronous subagent, **false of a named background one**, and
it steered them into the one channel that does not work.

So, in every dispatch prompt:

> **Deliver your report with `SendMessage` to the orchestrator. Your final assistant message is
> NOT delivered — text you simply write is lost. Send the report, then stop.**

And ask for it **once more on completion**: when a subagent signals idle without having sent
anything, `SendMessage` it a request for the report. That request often succeeds where the
agent's own final message did not.

### 5.2 Recovering a report that never arrived

**A missing report is not a lost run.** Subagent transcripts are on disk, and the report is in
them verbatim:

```
~/.claude/projects/<project-slug>/<session-id>/subagents/agent-*.jsonl
```

One file per subagent, named after it. Take the **last assistant text block** of each — that is
the report. A one-liner that dumps them all:

```bash
python3 - <<'EOF'
import json, glob
for f in sorted(glob.glob("agent-a*.jsonl")):
    texts = []
    for line in open(f):
        try: d = json.loads(line)
        except: continue
        m = d.get("message") or {}
        if d.get("type") == "assistant" and isinstance(m.get("content"), list):
            t = "".join(c.get("text", "") for c in m["content"] if c.get("type") == "text")
            if t.strip(): texts.append(t)
    print(f"===== {f} =====\n{texts[-1] if texts else '(none)'}\n")
EOF
```

Recover **before** re-running: a re-run costs the real network and the real engine again, and
overwrites nothing that would have been useful.

### 5.3 Reading a subagent's state without guessing

Three signals lie, and each one cost a wrong conclusion on the same run:

- **`idle` does not mean finished.** It means the agent ended a turn. Ask for the report.
- **No listeners on its ports does NOT mean the agent died.** It means the agent **cleaned up**,
  which is exactly what it was told to do. Reading a clean teardown as a crash is what turned a
  green suite into a "four agents died" report.
- **Database row counts do not tell you a scenario's outcome.** They prove something ran. They say
  nothing about whether the banner named the right site or the figures followed the data — which
  is the entire content of the assertion. **Never reconstruct a verdict from the backing store.**

**An unreported scenario is an unrun scenario** — until you have recovered its report from the
transcript. Do not report a scenario green on forensic evidence, and do not report it dead on
silence.

### 5.4 Isolation kit — what every dispatch prompt must pin

Parallel scenarios share a machine, and the failure mode is one agent's action landing in another
agent's app. Give each subagent, explicitly:

- **Its own ports and its own `DB_FILE`.** Never the project's default command if that command
  hard-codes ports — start the parts separately with the env vars.
- **A guard on every injected script**, keyed to its own port
  (`if (location.port !== '<its port>') throw …`). This is **load-bearing, not belt-and-braces**:
  a shared browser had its selected page stolen ~20 times across one parallel run, and the guard
  is what kept every action off the siblings' apps. Prefer in-page SPA navigation over
  driver-level page navigation, which is the operation that lands on the wrong page.
- **Its own browser context**, and a re-assert of viewport and emulated colour scheme before
  trusting any measurement.
- **Teardown by pid, and NEVER `pkill` by pattern.** `pkill node` kills every sibling's server
  mid-run. Also: a dev wrapper often **orphans its listener** — killing the pid the package
  manager returned can leave the real server still serving. Verify the port is actually free
  (`ss -lptn 'sport = :<port>'`) and confirm a pid is yours (e.g. via `/proc/<pid>/environ`)
  before killing it. Two agents on one run believed they had stopped an app that was still up, and
  one of them copied a database out from under it.
- **Restore state before starting the server**, not after: a server usually creates its database
  file on open, so a copy made afterwards is overwritten by a live process.

### 5.5 What to tell every subagent

Beyond its scenario and its ports:

- **The state it is handed**, with figures, and which parts of that state are deliberate. A
  scenario that does not know a third Profile is *supposed* to be populated will report it as a
  defect.
- **Report truthfully; a red is more useful than an optimistic green.** Say so explicitly, and say
  that an abridged step reported as green is worse than a red.
- **Re-measure before calling anything a defect.** Read the live DOM again rather than an earlier
  snapshot. Stale reads and driver quirks have produced more false findings on this suite than the
  app has produced real ones.
- **Partial beats silent.** If it cannot finish, it must report the part it did.

## 6. Execution rules (agent)

- **Retry on different data before raising a data-related finding.** If a step fails on a
  particular instance, retry with another instance of the same kind; a "data" finding is only
  justified if **all** reasonable instances fail, or if the behavior is structural.
- **Raise all findings**, blocking or not (console warning, surprising behavior, side effect,
  real breakage). You **qualify the severity**; a blocking finding fails the gate.
- **UI-first.** A backing-store probe only complements what the UI doesn't show, and only if a
  store exists.
- **Data selection by characteristics** (filters, badges…), not hard-coded IDs (HP mode): if
  no data satisfies the conditions, that's a legitimate signal, not an excuse to bypass the UI.

## 7. Report format

For each journey: `✅ / ❌ <id or issue> — <title>`, the failing steps, then:

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

- [ ] **Deliver the report via `SendMessage`** — its final message is not delivered
- [ ] Its own ports, its own `DB_FILE`, its own browser context
- [ ] Restore state **before** starting the server
- [ ] A `location.port` guard on every injected script
- [ ] Teardown **by pid**, never `pkill` by pattern; verify the port is free afterwards
- [ ] The state it is handed, with figures, and what about it is deliberate
- [ ] Re-measure before calling anything a defect; partial beats silent
- [ ] A truthful red beats an optimistic green; an abridged step reported as green is worse than a red

And after the run: **no report ⇒ ask via `SendMessage` ⇒ still nothing ⇒ recover from the
transcript (§5.2)**. Only then is a scenario genuinely unrun.
