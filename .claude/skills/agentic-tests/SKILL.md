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

> **"Tests" is two commands when the driver library is touched** (US-18, 2026-08-27). `npm test`
> checks the *application*; `npm run test:tools` checks the tooling under
> `docs/test-scenarios/tools/` that drives it, and it is deliberately **outside** `npm test` so the
> app's suite stays fast and a broken helper does not read as a broken app. A slice that touches
> that directory passes **both**. Without the rule spelled out, an agent reading "build + tests"
> runs `npm test` alone and the library becomes unguarded code — which is exactly what
> `theme-audit.js` was for four months: shipped, relied on by every theme pass, and tested by
> nobody.

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
   scenario, in parallel** — see [§5 Orchestration](#5-orchestration--one-subagent-per-scenario-in-parallel).
   Parallelism sits well inside the concurrent-subagent limit (20 by default); the thing to get
   right is **collecting** the reports, not spawning them.
4. Apply the **execution rules** (§6).
5. **Collect every report before concluding.** A scenario that has not reported has not run — but
   recover it from the transcripts (§5.2) before treating it as lost or re-running it.
6. Produce a per-scenario report (pass/fail) + a consolidated **Findings** section, ready to
   paste into the integration→develop PR. Report the prerequisite's own result as its own line.
7. **Audit §5 against what this run actually observed, and correct it** — §5.6. It is written from
   one incident and is knowingly ahead of its evidence; a run that leaves a stale warning standing
   makes every later run obey it.

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
2. **Then the HPs, one subagent each — but not all at once. Derive how many from the machine**
   (§5.7). On the 8-thread laptop this suite runs on that is **two**; run the third when a slot
   frees.
3. The orchestrator **collects the reports** (§5.1 — do not assume they arrive on their own) and
   consolidates.

### 5.1 Collecting the reports — do not assume delivery

**What the documentation says.** A background subagent's results reach the orchestrator *"as a
completion notification in a later turn"*, and the orchestrator waits for that notification before
reporting them. Delivery is supposed to be automatic. ([subagents docs](https://code.claude.com/docs/en/sub-agents))

**What happened on 2026-08-21.** Four scenarios each ran to completion and wrote full, detailed
reports. **None arrived.** No completion notification carried them — the orchestrator received only
`idle_notification`s, and an idle agent has not completed: it has ended a turn and is waiting. Of
five agents, exactly one was ever heard from, and only because it answered a follow-up with
`SendMessage`. Roughly thirty minutes of real-API work, green, invisible.

**What happened on 2026-08-22 (FP run, one subagent).** Delivery **worked** — twice. The subagent's
report arrived on its own, in full, with no prompting; a second, targeted report arrived the same
way. But in both cases an `idle_notification` followed **after** the report, carrying nothing, which
reads exactly like the 2026-08-21 symptom. Relancing on it produced a **duplicate** of a report
already received — and the subagent itself believed its first send had been lost, because a sender
cannot tell whether its message landed.

**What happened on 2026-08-23 (full HP suite: path 0, then three HPs in parallel).** Delivery worked
**4 out of 4**, every report unprompted, in full — including the **parallel fan-out**, which is the
exact shape that lost four reports on 2026-08-21. **No `SendMessage` relance was needed. No
transcript recovery was needed.** Each report was again followed by an empty `idle_notification`,
confirming that signal means nothing about delivery.

**What happened on 2026-08-24 (full HP suite again: path 0, then three HPs in parallel).** Delivery
worked **4 of 4** again, every report unprompted and in full, parallel fan-out included — and each
report arrived **twice**, once by `SendMessage` and once as the completion notification. Three full
suites and one FP now agree. Expect the double delivery; do not read the second copy as a new report.

That settles the open question of §5.6 as far as these runs can: **treat delivery as working**, in
parallel included. The 2026-08-21 loss remains unexplained and is now **history rather than a live
warning** — one incident, never reproduced across two later runs. Keep the ladder below, because it
costs one sentence in a dispatch prompt and a lost suite costs half an hour of real engine and
network time; but do not design a run around the assumption that reports vanish.

So the current picture, and it is narrower than the 2026-08-21 incident suggested:

- A report **can** arrive unprompted. Treat delivery as working, not as broken by default.
- **An `idle_notification` is not a signal that a report is missing.** It says the agent ended a
  turn, and it may well arrive after a report you already have. **Check what you have received
  before relancing**; a relance costs a duplicate at best and a re-run at worst.
- Ask (§5.1 below) only when a report is **genuinely** absent — nothing received for that scenario.

The cause of the 2026-08-21 loss remains unestablished, so do not encode one. What is established is
the **symptom** and the **cure**, and the cure is cheap:

1. **Tell each subagent to send its report with `SendMessage`** when it finishes, rather than
   relying on the automatic delivery alone. Belt and braces; the braces cost one sentence.
2. **On `idle` with nothing received, ask.** `SendMessage` the agent a request for its report. A
   completed subagent auto-resumes on `SendMessage`, so this works even after it has finished.
3. **Still nothing? Recover from the transcript** (§5.2). Never re-run first.

> **Do not tell a subagent "your final message is the only thing I see."** That was in the dispatch
> prompt on the run above, and it is the kind of confident falsehood that steers an agent away from
> the channel that actually works. Ask for `SendMessage` explicitly instead.

### 5.2 Recovering a report that never arrived

**A missing report is not a lost run.** Subagent transcripts are on disk — a documented location,
one file per agent, keyed by agent id — and the report is in them verbatim:

```
~/.claude/projects/<project-slug>/<session-id>/subagents/agent-*.jsonl
```

Take the **last assistant text block** of each — that is the report. Transcripts survive the main
conversation compacting, and are swept only after `cleanupPeriodDays` (30 by default), so a report
from an earlier session in the retention window is still recoverable. A one-liner that dumps them
all:

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

Three signals lie, and each one cost a wrong conclusion on the same run (2026-08-21):

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
agent's app. Everything below was measured on the 2026-08-21 run; re-check it (§5.6). Give each
subagent, explicitly:

- **Its own ports and its own `DB_FILE`.** Never the project's default command if that command
  hard-codes ports — start the parts separately with the env vars.
- **A guard on every injected script**, keyed to its own port
  (`if (location.port !== '<its port>') throw …`). This is **load-bearing, not belt-and-braces**:
  a shared browser had its selected page stolen ~20 times across one parallel run, and the guard
  is what kept every action off the siblings' apps. Prefer in-page SPA navigation over
  driver-level page navigation, which is the operation that lands on the wrong page.
- **Its own browser instance — a private one, as the DEFAULT and not the fallback** (measured
  2026-08-23, and this is the run's strongest operational finding). On the parallel HP fan-out the
  shared devtools browser stole the selected page from **all three** scenarios: ~7 steals over half
  of one agent's calls, 2 within the first 3 calls of another, 7 of 12 consecutive calls of the
  third — where one early `take_snapshot` returned **a sibling's full accessibility tree** before any
  guard could fire. Two of the three abandoned the shared browser mid-run and finished against their
  own Chrome; both reported zero theft afterwards. So do that from the start:
  - launch the bundled Chrome directly (on this host:
    `~/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome`), with **its own `userDataDir`** and
    **its own `--remote-debugging-port`**, and drive it with `puppeteer-core`;
  - **`--no-sandbox` is required on this host** — the bundled Chrome aborts with "No usable sandbox"
    otherwise;
  - do **not** expect to re-attach to an MCP page from a script: `browserContexts()` does not expose
    the MCP's isolated contexts, so `pages()` sees only the default context.
- **Run the theme pass with the driver library** (§5.8), not by re-deriving it. It re-asserts the
  viewport and the emulated colour scheme, and it asserts the theme *inside* the audited script,
  failing loudly when it is wrong. Measured 2026-08-23: the MCP's
  `emulate colorScheme` **did not survive page-selection churn** (a page emulated `light` later
  measured `prefers-color-scheme: dark` with nothing having asked for it). A theme audit that trusts
  the theme it requested can silently audit one theme twice.

  **Colour-scheme emulation has now failed in BOTH directions, on four separate runs — so never
  trust a theme you merely requested.** Over the US-16a slices (2026-08-24): emulation set over a
  CDP session that was then **detached** silently **reverted**, so a light pass measured `dark`
  (slices 04 and 05, two independent agents); and on another run the same emulation **survived** a
  detach into a later screenshot, which is the opposite failure (slice 02). Do not encode a
  mechanism — the two observations contradict any single one. What worked every time: keep **one CDP
  session alive** for the whole pass, and put a `matchMedia` **assertion inside** the audited script
  so a wrong theme throws instead of producing a plausible green. That assertion caught every one of
  these cases; nothing else did.
- **Teardown by pid, and NEVER `pkill` by pattern.** `pkill node` kills every sibling's server
  mid-run. Also: a dev wrapper often **orphans its listener** — killing the pid the package
  manager returned can leave the real server still serving. Verify the port is actually free
  (`ss -lptn 'sport = :<port>'`) and confirm a pid is yours before killing it. `/proc/<pid>/environ`
  is the first proof, but it is **often empty of anything identifying** — measured 2026-08-23 (FP),
  where neither the vite nor the Chrome pid carried a scratch path in `environ`. `/proc/<pid>/cmdline`
  is the second proof and worked where `environ` did not: the worktree path, `--strictPort <your
  port>`, `--user-data-dir` under your own scratch. Use whichever actually names you; do not treat an
  uninformative `environ` as evidence that a pid is not yours. **Re-confirmed 2026-08-24** on a
  vite listener started from the project directory: `environ` answered "not mine" about a process
  that was; `cwd` + `cmdline` + the `API_TARGET` it was given settled it. Note which way this fails —
  a check that wrongly says "not mine" leaves your own orphan for the next run to trip over. Two agents on one run believed they had stopped an app that was still up, and
  one of them copied a database out from under it.
- **`npx` interposes a wrapper, so the listener is usually a GRANDCHILD** (re-confirmed by three
  agents on 2026-08-23). Killing the pid you spawned leaves the real server listening. Kill the
  tree, then check the port — every agent on that run had to come back for a grandchild, and each
  one found it because it verified rather than assumed.
- **Kill the watcher, not just the listener — and prefer no watcher at all** (measured
  2026-08-22, US-15a FP). Killing the listener under a `tsx watch` wrapper leaves the **wrapper**
  alive, and a *free port is not proof of a stopped app*: the next edit to a source file makes the
  watcher **resurrect a server on that port**. On this run the port was verified free at 09:57, a
  commit touched the sources at 09:59, and the relaunch then failed `EADDRINUSE` against a server
  nobody had started. Worse than the nuisance: what is then serving is **code the agent never
  meant to test**. So kill the whole tree (wrapper included), and for a run that is *validating a
  specific commit* start the server **without watch** (`npx tsx src/main.ts`) — one pid, no
  resurrection, and no doubt about which code answered.
- **Ports are not necessarily free just because they were assigned to you** (2026-08-22): two
  orphans from the previous day still held the assigned pair. A subagent should **not** kill
  processes it cannot prove are its own — it should shift to a free pair, say which, and report the
  orphans for their owner.
- **Restore state before starting the server**, not after: a server usually creates its database
  file on open, so a copy made afterwards is overwritten by a live process.
- **`cp` can produce a corrupt copy even after a truncating checkpoint** — measured 2026-08-24
  (US-16a slice 04): a `cp` taken after `PRAGMA wal_checkpoint(TRUNCATE)` gave a database whose
  `evaluations` table read back as **"database disk image is malformed"**. `sqlite3 <src>
  ".backup <dst>"` worked on the same source. This is **stronger than the standing
  checkpoint-then-copy advice**, which three later runs followed without trouble — so the failure is
  not universal and its cause is not established. Prefer `.backup`, and **read the copy back**
  before trusting it either way.
- **But *seed* AFTER the server is up** (measured 2026-08-23, games-table-wide FP) — restoring and
  seeding are not the same operation and want opposite orders. An agent copied the database, wrote
  `analyzed = 1` into the copy, started the server, and read the rows back as **0**: the copied
  `-wal`/`-shm` sidecars and the open-time checkpoint discarded the write. The same `UPDATE` against
  the running server took immediately. So: **copy the database, start the server, then seed** — and
  read the seeded rows back through the app before trusting them. Note that seeding is a fallback:
  prefer state the UI can produce, and say in the report what you seeded and why the UI could not.

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

### 5.6 These instructions are provisional — verify them, and correct them

**§5 is written from a single run.** One incident, one machine, one day (2026-08-21). Its remedies
work, but its picture of *why* is incomplete by construction — and §5.1's central symptom is
explicitly at odds with what the official documentation promises. That gap is unresolved.

**So the next HP run carries a second job: audit this section against what it actually observes.**
Not as a chore at the end — as part of the run, because the run is the only experiment that can
settle any of it.

Answer these, and write the answers down:

> **Audit of 2026-08-24 (US-16a, five consecutive single-subagent FP runs).** Delivery worked **5 of
> 5**, unprompted, every report arriving **twice** — once by the subagent's own `SendMessage` and once
> as the completion notification, identical content. No relance was needed and no transcript recovery
> was needed, so §5.2 stays **unexercised**. `SendMessage` **resumed a completed subagent** to
> re-verify one fixed step, which was markedly cheaper than dispatching a fresh agent: it still knew
> its ports, its database copy and its browser. The private-browser default held — **zero page
> thefts** across all five runs, though each was a single agent, so these runs say nothing new about
> the parallel case. The `npx` grandchild listener was confirmed on **every** run, both servers each
> time. Two isolation claims were corrected in §5.4 rather than merely noted: the colour-scheme
> emulation (which has now failed in *both* directions) and the WAL copy (where `cp` produced a
> corrupt database that `sqlite3 .backup` did not). Driver-produced false findings: **three**, all
> caught by re-measuring — a stepper loop inside one `page.evaluate` that advanced a single ply
> (React re-renders between clicks, so the loop re-clicks a stale handler), a `Start`-button lookup
> that found nothing because `Start` is the current-ply caption rather than a button, and a
> "control present at ply 0" that was really the first of these. The rule of re-measuring before
> reporting has now caught more would-be defects than the app has produced real ones — on this run
> the score was 3 driver artefacts to 0 false app defects reaching a report.

- **Did any report arrive on its own**, as a completion notification, with no prompting?
  *(**Answered 2026-08-23**: yes — **4 of 4**, unprompted, including the three-way parallel fan-out
  that is the shape which lost reports on 2026-08-21. Two consecutive runs now say delivery works.
  This question is closed unless a run contradicts it; if one does, say so here rather than
  reverting the section wholesale. **Re-confirmed 2026-08-23 (games-table FP)**: the report arrived
  **twice** — once via the subagent's own `SendMessage`, once as the completion notification, with
  identical content. Three consecutive runs. The belt-and-braces instruction of §5.1 is what produces
  the duplicate; it is worth the cost, but expect the double delivery rather than reading the second
  copy as a second report. **2026-08-24 (full suite): 4 of 4, every one delivered twice.** The
  question stays closed.)*
- **Did the `SendMessage`-on-idle relance work?** For how many agents? *(2026-08-23: **not needed
  once** — nothing to relance. Separately confirmed the same day that `SendMessage` **resumes a
  completed subagent** with its environment knowledge intact: the games-table FP agent was sent back
  to re-verify one failed step on a new commit rather than a fresh agent being dispatched. That is
  the cheap path after a fix — it already knows its ports, its database copy and its browser.)*
- **Was transcript recovery needed at all?** If yes, was the path in §5.2 still correct?
  *(2026-08-23: **not needed**, twice over. The path is therefore still **unverified** since it was
  written — the one claim in §5.2 nobody has exercised. Do not delete it, but do not trust it blind
  either: check the directory exists before relying on it in an emergency. **2026-08-24: not needed
  a third time**, so §5.2 stays unexercised. This run's orchestrator was handed each subagent's
  transcript path directly by the harness, which is a likelier recovery route than §5.2's glob — but
  it is equally unexercised, so neither is a promise.)*
- **Do the isolation findings still hold** — the orphaned listener, `emulate` reloading the
  document, the shared browser stealing the selected page? *(2026-08-23: the orphaned listener and
  the page theft both hold and are **worse** than they were written; the theft is now the default
  expectation on a parallel run, which is why §5.4 makes a private browser the default rather than
  the fallback. `emulate` was found to lose its setting across page churn, which is a different
  failure from reloading the document. **2026-08-23 (games-table FP)**: with a private browser from
  the very start and every script port-guarded, **zero page thefts and no theme or viewport loss** —
  the single-subagent case, so it says nothing about the parallel one, but it does say the private
  browser removes the symptom rather than merely reducing it. The `npx` grandchild listener was
  confirmed again on both servers. **2026-08-24 — the parallel case the line above could not speak
  to: zero page theft across all four agents**, each on its own Chrome with its own `--user-data-dir`
  and CDP port, and no port guard ever tripped. So the private-browser default holds **in the exact
  shape** that produced the theft on 2026-08-23. The grandchild listener held again (an `npx` wrapper
  killed while its Vite child kept listening — twice, on two different agents), and the **WAL trap
  fired again** on path 0: 2.56 MB of `.db` beside 4.14 MB of `-wal`, so checkpoint-before-copy is
  load-bearing rather than ceremonial. The colour-scheme failure gained a **second mechanism**:
  emulation set over a CDP session that is then **detached** reverts silently, hit independently by
  two agents of this run, each auditing the dark palette twice until an in-script assertion caught
  it. Written up in `theme-pass.md`.)*
- **Did any driver produce a false finding?** *(2026-08-23: **five**, across three agents — a
  progress observer read only its first 40 of 1488 samples, a board parser keyed on `img` where the
  pieces are `div` backgrounds, a breadcrumb predicate assuming one parent, a candidate lookup
  matching non-clickable ancestors. Every one was caught by re-measuring before reporting. That rule
  has now caught more would-be defects than the app has produced. **2026-08-23 (games-table FP):
  zero** — one candidate (a badge that looked right-aligned) dissolved on re-measuring the computed
  `text-align`. The rule keeps paying for itself. **2026-08-24: three more** — an arrow parser
  filtering on `rgba(` that missed the fully opaque top candidate, plus the two reverted theme
  emulations above, each of which would have reported a green pass over a theme that never rendered.
  Caught by re-measuring or by an in-script assertion; none reached a report as a defect.)*

**Then correct the skill in the same run**, as a doc commit alongside the suite result. Three rules
for that edit:

- **Date every claim** you keep or add, so the next reader knows how old the evidence is.
- **Delete what has stopped being true.** A stale warning is worse than no warning: it is obeyed.
- **Do not state a mechanism you have not established.** Say what you observed and what you did
  about it. The first version of §5.1 asserted a confident cause that the documentation
  contradicted; the observation was sound, the explanation invented. Report the symptom and the
  cure, and leave the cause open until something actually demonstrates it.

> A runner's instructions describe a system that moves. This section is the only part of the skill
> that is knowingly written ahead of its evidence, and it stays honest only if each run pays a few
> minutes to re-check it.

### 5.7 What an agent costs, and how many fit

**Isolation and parallelism pull against each other, and §5.4 only argues one side.** Everything
there — a private browser each, its own ports, its own database — was written to stop agents landing
in each other's app, and it works. What it never says is that **it is also what makes a fan-out
expensive**: one scenario is no longer one process, it is a **full Chrome (multi-process) plus a Vite
dev server plus an app server**, and for HP-01 an engine pass on top. Three scenarios is three of
those trios, next to the developer's own desktop — their browser, their IDE, their terminals — on the
same machine.

That bill came due. On **2026-08-24** a three-way fan-out (after path 0, itself a fourth such trio)
left the machine wedged: the X11 session had to be killed and the requester held the power button.
The requester reports the same freeze **several times over three days**, and `/var/log/apport.log`
corroborates crashes on **2026-08-23 16:23**, **2026-08-24 00:29** and **2026-08-24 16:49**. So this
is a recurrence, not an anecdote — which is why it earns a rule rather than a warning.

**What the diagnosis found, and what it did not.** No OOM kill, `systemd-oomd` inactive, nothing
thermal, no `MCE`, no i915 GPU hang logged. The two crash dumps (Chrome, VS Code, both `SIGTRAP`)
are dated *after* the session began its orderly exit, so they are collateral of the teardown rather
than its cause. The honest reading is **CPU and responsiveness starvation**, not memory exhaustion —
and the trigger of the session exit is **not established**. Do not write a mechanism here that
nobody has demonstrated; this section exists to bound the load, not to explain the freeze.

**The budget, in threads.** Sustained, an agent's trio behaves like roughly **four threads' worth**
of work. So:

```
concurrent agents = min(3, floor(nproc / 4))
```

Three because the suite is three scenarios — above that the cap is moot, not virtuous. `floor(nproc
/ 4)` because that is what leaves the machine answering. Read `nproc` and decide; do not carry a
number over from another machine. On the 8-thread laptop this suite runs on: **2**. On 4 threads: run
them **in series**. Leave the developer's own desktop out of the arithmetic — it is already the
reason for the divisor rather than a share to be subtracted.

**Do not "optimise" this by sharing the browser again.** That is the tempting move once the cost is
named, and it walks straight back into the page theft of 2026-08-23, where one `take_snapshot`
returned a sibling's entire accessibility tree. The private browser is the expensive half of a
trade that was made deliberately. **Pay it in serialisation, not in isolation.**

### 5.8 The driver library — call it, do not re-derive it

**Added 2026-08-27 (US-18, ADR-0020).** The mechanics below used to be re-written by every agent on
every run, and measurement said that composing those scripts is **a third of what the suite costs** —
and the source of the suite's false findings besides. They now live in the repository, under
`docs/test-scenarios/tools/`, split into a **host** half (`host/`, runs on the machine) and a **page**
half (runs inside the page under test). The two halves never import each other.

**Name it here and nowhere else.** The scenarios under `docs/test-scenarios/` carry no launch command
and must keep carrying none — that property is why they survived a complete change of pilot without a
line moving. A scenario that calls a helper is a script coupled to a pilot.

**It drives; it never judges** (ADR-0020). It returns raw values and it throws when the *mechanism*
failed. What the app says is still yours to read and judge — that is the part no helper touches, and
the only part that produces findings.

| What | Where | What it gives you |
|---|---|---|
| A private Chrome, and one CDP session kept alive | `host/cdp.mjs` | `launchBrowser`, `attach`, `open`, `setViewport`, `emulateTheme`, `session.evaluate`, `session.stop` |
| The theme pass, one call per screen | `host/theme-pass.mjs` | `runThemePass` — the nine screens of `theme-pass.md` in both themes, eighteen raw readings |
| What a pass cost, after the fact | `host/run-ledger.mjs` | per scenario the wall and five buckets; the suite's lived and worked walls |

```js
import { launchBrowser, setViewport } from "<repo>/docs/test-scenarios/tools/host/cdp.mjs";
import { runThemePass } from "<repo>/docs/test-scenarios/tools/host/theme-pass.mjs";

const session = await launchBrowser({ cdpPort: 9299 });      // your own browser, your own port
await setViewport(session, { width: 1280, height: 900 });
const readings = await runThemePass({
  session,
  baseUrl: "http://localhost:5199/",
  port: "5199",                                              // guards every injected script
  profile: "DudulSmash",                                     // a fresh browser has none current
});
await session.stop();
```

Three things it is worth knowing it does for you, each of which cost somebody a run:

- **No `puppeteer-core` to install.** Node 22 ships a global `WebSocket`, so the library speaks CDP
  directly. Previous runs each installed a driver into a scratch directory of their own.
- **The inventory of screens is read from `theme-pass.md`**, never copied. That document stays the
  one place the screens are edited.
- **It throws rather than hand back a thinner green.** The port guard and the in-script theme
  assertion are both live: falsify the emulation and the call fails with the theme it actually
  measured. Measured 2026-08-27: eighteen audits over nine screens in **15 seconds**.
- **"The screen has rendered" is two conditions, not one** — and getting that wrong is the defect
  this slice's own Feature Path caught. Text stability alone is satisfied *instantly* by a loading
  placeholder: "Chargement du bilan…" holds perfectly steady, so `/confrontation` was audited at
  ~300 ms while its content arrived at ~600, reporting thirteen text nodes out of seventy with
  `problems: 0`. The helper now waits for the app to have **stopped fetching** as well. If you ever
  write your own wait, wait for both.

A screen the scenario's state cannot reach comes back as `unreachable` **with its reason**, not
missing — read those before reading the readings.

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

- [ ] **Deliver the report via `SendMessage`** on completion — cheap belt-and-braces; delivery itself
      is now demonstrated working, parallel included (§5.1, 2026-08-23)
- [ ] Its own ports, its own `DB_FILE`, and **its own private browser instance** — not the shared one
      (§5.4: all three scenarios of the 2026-08-23 run had their page stolen)
- [ ] **Concurrency derived from the machine**, `min(3, floor(nproc / 4))` — §5.7. One private
      browser per agent is what makes a fan-out expensive, and three trios wedged this machine
      repeatedly between 2026-08-22 and 2026-08-24. Never carry a number over from another host
- [ ] Restore state **before** starting the server
- [ ] A `location.port` guard on every injected script
- [ ] Teardown **by pid**, never `pkill` by pattern; verify the port is free afterwards
- [ ] The state it is handed, with figures, and what about it is deliberate
- [ ] Re-measure before calling anything a defect; partial beats silent
- [ ] A truthful red beats an optimistic green; an abridged step reported as green is worse than a red

And once the suite is in: **did §5 describe this run correctly?** Correct it if not (§5.6).

And after the run: **no report ⇒ ask via `SendMessage` ⇒ still nothing ⇒ recover from the
transcript (§5.2)**. Only then is a scenario genuinely unrun — and even then, check the transcript
before paying for the network and the engine a second time.
