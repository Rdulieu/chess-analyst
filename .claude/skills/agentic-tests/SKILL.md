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
   **Paste the run ledger with it** (§5.8): per scenario the wall, the five buckets and the **worst
   wait**, then the suite's worked wall. A gate that carries its own measurement lets a reviewer see
   a trend rather than an anecdote — provided the figures are read for what they are (§5.1: the
   ledger cannot see the orchestrator, so none of them is the requester's wait).
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
3. The orchestrator **collects each report the moment it arrives**, consolidates as it goes, and
   **stops the task once its report is in** (§5.1) — a finished subagent stays resident and can be
   woken for nothing long after the gate has shipped.

### 5.1 Collecting the reports — what the 2026-08-25 gate actually did

**Rewritten 2026-08-27 (US-18 slice 05), in replacement — and then corrected the same day, because
the first rewrite got its facts wrong.** Both versions are worth knowing about: this section spent a
year arguing that delivery might fail, and then spent an afternoon arguing that collection was slow.
Neither was true, and the second error was found by re-reading the transcript the claim was built on.

**What the parent session of the 2026-08-25 gate says, line by line:**

| | |
|---|---|
| requester asks | `11:54:47` |
| path 0 dispatched | `12:01:33` · report received `12:08:32` · acted on `12:08:41` |
| HP-01, HP-03 dispatched | `12:09:18`, `12:09:53` |
| HP-03's report sent | `12:41:27` · **received `12:41:30`** · acted on `12:41:40` |
| HP-02's report | **received `12:44:22`** · consolidated `12:44:32` |
| gate delivered (PR #77) | `12:52:30` |

**Every report was collected within seconds of arriving.** The requester waited **57.7 minutes**, of
which the suite itself spanned **43.0 minutes** against **42.6 minutes of work** — about **twenty-one
seconds** of collection slack across the whole pass. There was nothing to reclaim.

**So where did "74 minutes, 31 of them waiting" come from?** From the ledger's *first turn → last
line* figure, read as if it were the requester's wait. Its right edge was HP-03's transcript gaining
one more line at **13:15:13** — twenty-three minutes *after* the gate had shipped — when a residual
background watcher left over from HP-03's own earlier run woke it for nothing. A subagent **stays
resident after it reports**, and a stray watcher can poke it long after anybody cares.

That is the real finding of this slice, and it is not the one it was written for:

> **A finished subagent is still alive.** It costs nothing while idle, but it can be woken, it will
> answer, and its transcript will keep growing — which then corrupts any figure whose right edge is
> "the last line anybody wrote". **Stop what you dispatched once you have its report**, and never
> read a wall-clock span that ends on a transcript's last line as somebody's wait.

**What is established about delivery itself, each claim with its date:**

- **Delivery works, parallel fan-out included** — 2026-08-23 (4/4), 2026-08-24 (4/4 and 5/5),
  2026-08-25 (4/4, seconds each). Treat it as working.
- **Expect each report twice**, once by the subagent's `SendMessage` and once as the completion
  notification. **The second copy is not a second report.** (On 2026-08-27 the harness absorbed the
  duplicate before it reached the conversation, so that run demonstrates nothing either way — the
  rule rests on the runs of 23 and 24 August.)
- **An `idle_notification` says nothing about delivery.**
- **The 2026-08-21 loss remains unexplained and is history**, never reproduced. §5.2 stays as a
  recovery path; do not design a run around the fear.

**What the orchestrator does:**

1. **Act on the first arrival**, and consolidate as you go.
2. **Check what you already hold before relancing.** A relance costs a duplicate at best and a re-run
   of real engine and network time at worst.
3. **Ask only when a report is genuinely absent**, then §5.2, then — last — a re-run.
4. **Stop the task once its report is in.** Not for speed: so that nothing wakes it afterwards, and
   so the run's own measurement stays readable.

**And read the ledger's figures for what they are.** It reads subagent transcripts and **cannot see
the orchestrator's session**, so none of its numbers is the requester's wait. Its `worst wait` column
is worth reading — it names the agent that sat longest with nobody coming — but with both traps in
mind: **0.0 also means "nobody ever came back"**, since the wait after a transcript's last line
cannot be measured, and a **large value may be a dead tail after the gate shipped** rather than
anybody waiting. Cross-check against the orchestrator's own timeline before calling either a defect.

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
- **"running · started 2d ago" is the SPAWN time, not elapsed work.** A subagent is frozen with its
  parent session and resumes with it. Measured 2026-08-31: an agent listed as running for two days
  had worked **eleven minutes**, then nothing for 61 h 44 — the exact span the session was suspended
  — then resumed the minute the session did. Diagnosing a hang from that number is how a healthy pass
  gets killed and paid for twice. Read the timestamps in its transcript and look for the largest gap;
  a gap that starts at the suspension and ends at the resume is not a hang.
  **The corollary bites the other way**: what the agent *launched* does not freeze. Its app and its
  browser stayed up for 2 h 14 over two days holding three ports, because no teardown was ever
  reached. If a session may not resume, those are orphans for the next run — check `ss -lptn` before
  assigning ports.
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

**Rewritten 2026-08-27 (US-18 slice 03), in replacement.** What this section used to be was
a recipe: eleven mechanics an agent had to re-derive, each one written up with the run it cost.
Those mechanics now live in `docs/test-scenarios/tools/host/app-lifecycle.mjs` (§5.8) and are
executed rather than read. Only two things belong here now — **what a dispatch must pin**, and
**the evidence** for why the library does what it does, so nobody "simplifies" it back.

An old, well-evidenced instruction that keeps sitting beside a new one always wins; that is why
this is a replacement and not an addition.

**What every dispatch prompt must still pin**, because no helper can choose these for an agent:

- [ ] **Its own server port, its own client port, its own CDP port, and its own `DB_FILE`.**
      `launchApp` refuses to fall back on the project's defaults — an agent that forgets its
      ports gets an error rather than somebody else's app on `:3001`.
- [ ] **Ports it has *checked*, not merely been assigned.** On 2026-08-22 two orphans from the
      previous day still held an assigned pair. `launchApp` throws naming the port; the agent
      then **shifts to a free pair, says which, and reports the orphans for their owner** — it
      does not kill what it cannot prove is its own.
- [ ] **Its own private browser.** `launchBrowser` gives it one, with its own `--user-data-dir`
      and its own debugging port.
- [ ] **The state it is handed**, with figures, and which parts of that state are deliberate.
- [ ] **Teardown, and the proof of it.** `stopApp` frees the ports and verifies them; it throws
      if anything is still listening that it did not deliberately spare.

**The evidence the library encodes.** Each of these cost a run. They are recorded so that a
future reader knows the helper's shape is measured rather than defensive — and so that a bug in
a helper is recognised as *this* returning, not as a new mystery.

- **Restore before starting.** A server creates its database when it opens it, so a copy laid
  down afterwards is overwritten by a live process.
- **`PRAGMA wal_checkpoint(TRUNCATE)` → `.backup` → read the copy back — and the two halves
  catch different things.** Measured 2026-08-27 against a **2 MB `-wal` held open by a writer**:
  a `cp` without a checkpoint produced a copy that **read back clean** while having silently lost
  an entire table and its 400 rows. So the read-back is **not** what saves you from the WAL trap:
  it catches corruption (`database disk image is malformed`, a table that will not open, a file
  with no table in it) and it is blind to silent loss. **`.backup` is what protects; the
  read-back is what catches corruption.** Both are needed, and neither substitutes for the other.

  Two corollaries, both measured the same day. The checkpoint **can be refused in silence** — under
  a writer it returns `1|0|0` with exit status 0, the leading 1 meaning busy. Refused does not mean
  without effect: a busy checkpoint has been seen merging 49 frames of 49 and failing only to
  *truncate*, so read `framesMerged` rather than assuming either way — and never assume the WAL was
  emptied, which is why `.backup` is the half that must not be dropped.
  And `cp` is not *reliably* wrong: on a database whose `-wal` is empty it copies perfectly, which
  is exactly why "it worked when I tried it" is no argument. `restoreSnapshot` does the whole
  sequence and returns both the row counts and whether the checkpoint was refused.
- **But *seed* AFTER the server is up** (2026-08-23): restoring and seeding want opposite orders.
  An agent copied the database, wrote `analyzed = 1` into the copy, started the server and read
  the rows back as **0** — the copied sidecars and the open-time checkpoint discarded the write.
  Seeding is a fallback: prefer state the UI can produce, and say in the report what you seeded
  and why the UI could not.
- **The listener is usually a GRANDCHILD.** `npx` interposes a wrapper, so killing the pid you
  spawned leaves the real server serving. Re-confirmed on every run since 2026-08-23 and again
  2026-08-27, where `launchApp` spawned 636937/636938 while the listeners were 636997/636974.
  `stopApp` walks the port's holders for exactly this reason.
- **No watcher at all for a run that validates a commit** (2026-08-22). Killing the listener
  under a `tsx watch` wrapper leaves the wrapper alive, and *a free port is not proof of a
  stopped app*: the next edit to a source file makes the watcher **resurrect a server on that
  port**. Worse than the nuisance — what is then serving is code the agent never meant to test.
  `launchApp` starts `tsx src/main.ts`, one pid, no resurrection.
  **The client is a different case and is left alone deliberately**: the suite drives the Vite dev
  server, which *is* a watcher — but it hot-reloads rather than resurrecting anything, and building
  the client instead would change what is being tested (a production bundle rather than the app the
  whole suite drives). Known constraint, not a defect to rediscover.
- **An in-page drill-down has no navigation to wait on.** `waitForScreen` guards a route change; a
  control that only swaps a list in place does not change route, so reading the list straight away
  reads the *old* one — or an empty one mid-fetch. Measured 2026-08-31: the explorer's depth cap was
  reported three times at the wrong depth (31, then 35, then 38 plies) before a wait on
  `pendingRequests() === 0` plus the expected breadcrumb depth found the real one, 40. Wait for the
  network yourself.
- **A board square's tint is on a div INSIDE `[data-square]`**, where
  `react-chessboard` puts `squareStyles` — so a driver reading the square element itself
  reports an unmarked board while the tint is right there. Measured 2026-09-01 on the FP of
  US-23-06: a false red, lifted only by re-reading the DOM. `squareTints()` in the page half
  now reads the right node; use it rather than writing the lookup again.
- **After `open()`, `location.port` can still be empty on the first evaluate** — and the port
  guard then fires against a blank document ("port guard: this is , not 5232"), which looks exactly
  like the theft it exists to catch. Measured 2026-09-01: `Page.loadEventFired` had evidently been
  consumed for `about:blank`. Poll `location.port` until it reads your own before the first guarded
  call. Related, same run: **launch the app in the background**. A foreground `node` boot killed at
  the shell's 100 s timeout takes the *detached* app children with it, leaving free ports and a
  chrome-error page — a run that dies there proves nothing rather than failing.
- **`launchBrowser` keeps the Node process alive** — an open socket and a piped stderr — so a boot
  script that launches the app and the browser never returns, and a foreground call dies at the
  two-minute timeout taking the browser with it. To drive in phases across several shell calls, end
  the boot script with an explicit `process.exit(0)` and re-attach to the CDP port afterwards.
- **On a shared worktree, "is this pid mine?" has a weaker answer than it looks.** `namesMe` proves
  ownership by the process's directory — and when three scenarios run from the **same** worktree that
  matches any of them (measured 2026-08-31). Nothing was at risk on that run, because `stopApp` only
  inspects the holders of *your own* ports; but the proof would say "mine" about a sibling's server
  if one ever held one of yours. The port assignment is what keeps this safe, which is why shifting
  ports on a collision — and **saying which** — matters more than it appears.
- **`blur()` on an element that was never focused fires nothing**, and the resulting reading looks
  exactly like a defect: on 2026-08-31 an emptied-Note probe showed an empty box beside "Note
  enregistrée.", which is precisely the contradiction the code exists to prevent. Same shape as the
  380 px click-into-the-void — **assert the focus landed before believing the measurement.**
- **Never `pkill` by pattern**: it kills every sibling's server mid-run. And read that as being
  about **matching by pattern**, not about the `pkill` binary: `pgrep -f <pattern> | kill` is the
  same trap wearing a different hat. Measured 2026-08-31 — an agent ran `pgrep -f "node bridge.mjs"`
  and matched the `bash -c` process whose *command line contained that string*, killing the shell it
  was running in before its own teardown could run and leaving the app up on two ports. A substring
  of somebody else's command line is not evidence.
- **Never kill what you cannot prove is yours, and the proof is the tree — not the port.**
  `/proc/<pid>/environ` has lied in **both** directions: uninformative on a vite and a Chrome pid
  (2026-08-23), and answering "not mine" about a process that was (2026-08-24). `cwd` and
  `cmdline` are the proofs that worked. What is *not* a proof is your port appearing in somebody's
  arguments — measured 2026-08-27, a `python3 -m http.server 3222` started from `/tmp` was
  declared mine and killed on that basis alone. `namesMe` now requires the process to run under
  your root, and returns the **reason** with the verdict, because the two error directions are not
  equal: wrongly "not mine" leaves your own orphan for the next run, wrongly "mine" takes down a
  sibling's run.
- **A private browser is the default, not the fallback.** On the parallel fan-out of
  2026-08-23 the shared devtools browser stole the selected page from **all three** scenarios —
  one early `take_snapshot` returned a sibling's entire accessibility tree. 2026-08-24, with a
  private Chrome each: **zero thefts across four agents**. Also: do not expect to re-attach to an
  MCP page from a script.
- **A `location.port` guard on every injected script.** Load-bearing, not belt-and-braces: it is
  what kept every action off the siblings' apps during those ~20 thefts. `theme-pass.mjs` puts
  one on everything it evaluates.
- **Never trust a theme you merely requested.** Colour-scheme emulation has failed in **both**
  directions across four runs — set over a CDP session then detached, it silently reverted (two
  agents, 2026-08-24, each auditing the dark palette twice); on another run the same emulation
  **survived** a detach, which is the opposite failure. Four observations disagree about the
  mechanism; none disagrees about the remedy: **keep one session alive for the whole pass, and
  assert the theme inside the audited script.** That assertion caught every one of these cases;
  nothing else did.

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
work, but its picture of *why* is incomplete by construction.

> The sentence that stood here until 2026-08-27 said the gap between §5.1's symptom and the official
> documentation was unresolved. It is resolved: delivery works, and §5.1 no longer argues otherwise.
> What follows is a **dated audit log**, kept as written — some of its notes now point at text that
> has been replaced, and that is the nature of a log rather than a defect in it.

**So the next HP run carries a second job: audit this section against what it actually observes.**
Not as a chore at the end — as part of the run, because the run is the only experiment that can
settle any of it.

Answer these, and write the answers down:

> **Audit of 2026-08-31 (US-22, the full HP suite: path 0, then three scenarios two at a time).**
> Delivery worked **4 of 4**, unprompted, each report arriving **twice** — once by the subagent's own
> `SendMessage` and once as the completion notification. No relance, no transcript recovery: §5.2
> stays unexercised, now across four consecutive suites. The **private-browser default held again in
> the parallel case** — zero page thefts, zero port-guard trips, across four agents of which two ran
> concurrently. §5.7's cap of **2** on this 8-thread machine was respected and **the machine did not
> freeze**, which is the first full suite since the rule was written.
>
> Driver-produced false findings: **five**, every one caught by re-measuring, none reaching a report
> as a defect. HP-01 lost a whole journey to a poll regex that also matched the profile counter — it
> closed the browser 15 ms after clicking and burned a real chess.com import; HP-02 read the
> explorer's depth cap **three times** at the wrong depth because an in-page drill-down has no
> navigation to wait on; HP-03's `blur()` on a never-focused textarea fired nothing and produced a
> reading that looked exactly like the defect the code exists to prevent. The score is now
> overwhelming: this suite's drivers have produced far more would-be defects than the app has
> produced real ones, and the rule of re-measuring is what stands between them and a report.
>
> Two isolation claims were **corrected rather than noted**, both in §5.4: `namesMe` proves ownership
> by directory, which on a shared worktree matches every sibling; and `pgrep -f`/`/proc` scans match
> the very shell running them. Two library holes were closed in the same run — `restoreSnapshot` was
> writing to the requester's protected database, and a wedged CDP socket took the teardown with it.
>
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
  identical content. Three consecutive runs. The belt-and-braces instruction (now in §8) is what
  produces the duplicate; it is worth the cost, but expect the double delivery rather than reading
  the second copy as a second report. **2026-08-24 (full suite): 4 of 4, every one delivered twice.** The
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

> **Update 2026-08-27 (US-18 slice 05).** §5.1 was rewritten in replacement, and the questions below
> about delivery are answered there rather than here — delivery works, each report arrives twice, and
> the `SendMessage` relance has not been needed since 2026-08-22. Two of this section's older notes
> now point at text that no longer exists; they are kept because this is a dated audit log, not a
> statement of the current rules.
>
> The update is worth reading for **how** it went wrong. The first version of the rewrite announced
> that the 2026-08-25 gate had wasted 31 of its 74 minutes waiting to collect, on the strength of the
> ledger's first-turn-to-last-line figure. Its own Feature Path re-read the parent transcript and
> refuted it: every report was collected in seconds, the requester waited 58 minutes, and the extra
> 31 were a finished subagent woken by a stray watcher **after** the gate had shipped. A measurement
> is not evidence for a story until somebody checks that the story is what it measures.

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
| Restore, launch, stop the app | `host/app-lifecycle.mjs` | `restoreSnapshot`, `readBack`, `launchApp`, `stopApp`, `holdersOf`, `namesMe`, `describeProcess` |
| A private Chrome, and one CDP session kept alive | `host/cdp.mjs` | `launchBrowser`, `attach`, `open`, `setViewport`, `emulateTheme`, `session.evaluate`, `session.stop` |
| The theme pass, one call per screen | `host/theme-pass.mjs` | `runThemePass` — the nine screens of `theme-pass.md`, in both themes and at both **widths**, thirty-six raw readings |
| Navigate, and read a field back | `host/navigate.mjs` + `page/app-driver.js` | `followNav`, `reachScreen`, `selectProfile`, `setField`, `waitForScreen`, `guarded` |
| Assertion 7 — what the Player acts on never moves | `host/stability.mjs` | `walkPlyStability` — steps the plies and hands back the **displacements** of the stepper and the verdict fieldset, in viewport pixels. It measures; the scenario passes the sentence (zero) |
| What a pass cost, after the fact | `host/run-ledger.mjs` | per scenario the wall, five buckets and the **worst wait**; the suite's lived and worked walls. `--every` costs every subagent of a session rather than the pass inside it |

```js
import { restoreSnapshot, launchApp, stopApp } from "<repo>/docs/test-scenarios/tools/host/app-lifecycle.mjs";
import { launchBrowser, setViewport } from "<repo>/docs/test-scenarios/tools/host/cdp.mjs";
import { runThemePass } from "<repo>/docs/test-scenarios/tools/host/theme-pass.mjs";

// Restore BEFORE starting, and read the copy back before trusting it.
const { tables } = restoreSnapshot({ from: snapshot, to: "/my/scratch/scenario.db" });
const app = await launchApp({
  repoRoot, serverPort: 3211, clientPort: 5211, dbFile: "/my/scratch/scenario.db",
});                                                          // throws if a port is taken, naming it

const session = await launchBrowser({ cdpPort: 9299 });      // your own browser, your own port
const readings = await runThemePass({                        // it sets the viewport itself, per width
  session,
  baseUrl: app.baseUrl,
  port: "5211",                                              // guards every injected script
  profile: "DudulSmash",                                     // a fresh browser has none current
});
await session.stop();
await stopApp(app);   // frees the ports, grandchildren included, and throws if one is still held
```

Three things it is worth knowing it does for you, each of which cost somebody a run:

- **No `puppeteer-core` to install.** Node 22 ships a global `WebSocket`, so the library speaks CDP
  directly. Previous runs each installed a driver into a scratch directory of their own.
- **The inventory of screens is read from `theme-pass.md`**, never copied — and since US-22 the
  **widths** are read from it too. That document stays the one place either is edited.
- **The pass owns the viewport.** It walks each width in turn and sets it itself, so do not pin one
  before calling it — `setViewport` is for a scenario measuring one screen at one size. Each injected
  script asserts the width it measures, exactly as it asserts the theme, and for the same reason: an
  override that did not take would report a green narrow screen that never rendered.
- **It does not choose which Game or which Profile the pass opens — you do.** Left to itself it takes
  the first row, and on 2026-08-27 that was an *unanalysed* Game for two scenarios running, so the
  pass audited `Analyse` with no evaluation curve, no advantage bar and no severity glyph. Green, on
  the wrong Game. Pass `openers` when your assertions depend on it:
  ```js
  import { gameRows, openGameRow } from "<repo>/docs/test-scenarios/tools/host/navigate.mjs";
  const rows = await gameRows(session, { port });            // raw; you decide which
  await runThemePass({ …, openers: {
    "/analyse/:gameId": (s, { port, waitOptions }) =>
      openGameRow(s, { port, index: rows.findIndex((r) => r.text.includes("analysée")), waitOptions }),
  } });
  ```
- **Assertion 7 is one call, and it counts steps rather than clicking in a loop.** `walkPlyStability`
  sends **one** `step('Next')` per evaluation: a loop of clicks inside a single `evaluate` re-clicks a
  handler the framework has already replaced, which on 2026-08-24 advanced one ply while reporting
  eight. A target absent at a ply (the verdict fieldset does not exist at the starting Position) is
  reported **absent**, never folded into a zero — otherwise ply 0 reads as the most stable transition
  there is.
- **The source of a restore is never written to.** `restoreSnapshot` opens it `-readonly` and lets
  `.backup` read through an unmerged WAL on its own (measured against 4152 bytes of frames with the
  writer still connected). It used to checkpoint the source first, which was a write path onto the
  one file ADR-0015 exists to protect, on every Feature Path that copies the requester's base. What
  the checkpoint reported is kept as `source.walBytes`, observed rather than merged.
- **Every CDP call is bounded, and so is the close.** A wedged socket is not a slow page: on
  2026-08-31 one died with Chrome and the app both alive and answering HTTP, every later
  `Runtime.evaluate` hung for ever, and the teardown hung with them — so the run was SIGKILLed with
  its ports still held. `send` now rejects on a deadline and `close` gives up rather than waiting for
  an event that is not coming. If you see "the socket is wedged, not slow", the app is probably fine
  and the browser is not.
- **`launchBrowser` returns the session itself**, carrying `.stop` — not a `{ session }` wrapper.
  Destructuring it as one throws *before* whatever `try` was meant to guard the teardown, and leaves
  a Chrome holding the CDP port (2026-08-28; recovered by proving the pid's own `--user-data-dir` in
  `/proc/<pid>/cmdline`).
- **`currentMove()` is a caption, not a movement detector.** Two consecutive plies can carry the
  same SAN, so a walk loop that breaks when the caption "did not change" stops after one transition
  and reports a two-reading walk as a fourteen-transition one (measured 2026-08-31). `walkPlyStability`
  counts steps and does not have this bug; anything hand-rolled should key on something exact, such as
  the verdict group's `declared-severity-<ply>` name.
- **At 380 px, everything below the board is off the screen** — the reading route's Note panel sits
  at y≈1115 in a 900 px viewport. A real mouse click at those coordinates lands in the void, types
  nothing, and hands back three *identical* measurements that read as "nothing changed: green" over a
  step that never happened (measured 2026-08-28). Scroll the target into view, and **assert the focus
  actually landed** before typing.
- **`runThemePass` leaves the browser on the last screen of the inventory** (`/profiles/:id`). A
  follow-up script that assumes it is still where it was reads a missing panel and reports a defect.
  Navigate explicitly after the pass.
- **A screenshot can be a measurement that measured nothing.** `Page.captureScreenshot`'s `clip` is
  in **page** coordinates and needs `captureBeyondViewport: true` for anything below the fold —
  without it the PNG comes back the right size and entirely blank (2026-08-28). Worth knowing here
  because judging a glyph at its real size is the one check no assertion can replace: the FP of
  US-16a passed "nothing by tint alone" to the letter while shipping two pencils the eye could not
  tell apart.
- **A field is read back before anything is submitted.** `setField` puts the value in through the
  native setter, reads it out again, and **throws** if it did not take. The import form's month
  fields keep their default when a driver assigns `value` — measured 2026-08-19, where a run nearly
  imported the wrong months for a reason that had nothing to do with the app.
- **Navigation happens in the page, not at the driver.** Driver-level navigation is the operation
  that lands on the wrong page. And the Game row opens **through the opponent's name** — a
  `button` navigating by program until US-23 (2026-09-01, which made it an anchor), so what is worth
  knowing is not the element type but that the door is in that one cell: a driver clicking the row,
  or hunting for a button in it, records `Analyse` as unreachable. The fact that this line had to be
  rewritten rather than merely re-read is the point of §5.6.
- **It throws rather than hand back a thinner green.** The port guard and the in-script theme
  assertion are both live: falsify the emulation and the call fails with the theme it actually
  measured. Measured 2026-08-27, over three runs: eighteen audits over nine screens in **15.6 seconds**, and a whole scenario shape — restore, launch, the pass, teardown with the ports proved free — in **20.3 seconds**. Since US-22 the pass is **thirty-six** audits — the second width costs **+23,6 s of driving** (20,8 → 44,4 s) and eighteen more readings to read.
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

- [ ] **Deliver the report via `SendMessage`** on completion — delivery is demonstrated working,
      parallel included, and each report arrives **twice** (§5.1). Collect on the first copy; the
      second is not a second report
- [ ] Its own ports, its own `DB_FILE`, and **its own private browser instance** — not the shared one
      (§5.4: all three scenarios of the 2026-08-23 run had their page stolen)
- [ ] **Concurrency derived from the machine**, `min(3, floor(nproc / 4))` — §5.7. One private
      browser per agent is what makes a fan-out expensive, and three trios wedged this machine
      repeatedly between 2026-08-22 and 2026-08-24. Never carry a number over from another host
- [ ] **Drive with the library (§5.8)**, not with a script re-derived on the spot — `restoreSnapshot`
      / `launchApp` / `stopApp` for the app, `launchBrowser` for the browser, `runThemePass` for the
      theme. Restoring before starting, the `location.port` guard, teardown by pid down to the
      grandchild and the check that the port is really free are all inside those calls; they are
      listed in §5.4 as **evidence**, not as a recipe to retype
- [ ] The state it is handed, with figures, and what about it is deliberate
- [ ] Re-measure before calling anything a defect; partial beats silent
- [ ] A truthful red beats an optimistic green; an abridged step reported as green is worse than a red

And once the suite is in: **did §5 describe this run correctly?** Correct it if not (§5.6).

And after the run: **no report ⇒ ask via `SendMessage` ⇒ still nothing ⇒ recover from the
transcript (§5.2)**. Only then is a scenario genuinely unrun — and even then, check the transcript
before paying for the network and the engine a second time.

And when the reports are in: **stop the tasks**, then **cost the run** (§5.8) and read the **worst
wait** column with §5.1's two traps in mind — `0.0` can mean "abandoned" as easily as "collected at
once", and a large value can be a dead tail after the gate shipped. Cross-check against your own
timeline before calling either a defect.
