# Orchestration — the HP fan-out, and everything it has cost

Annex to the `agentic-tests` skill. The **rules** live in the skill (§5); this file carries the
**evidence and the dated log** behind them. It was split out on 2026-09-04: the runner had grown to
833 lines, 686 of them this material, loaded on **every** invocation including a single Feature Path
that fans nothing out. The skill itself asked for the split — it described this content as *"a dated
audit log, kept as written"*.

Read it when you are about to orchestrate a suite, when a report has not arrived, when a subagent
looks hung, or when you are costing a pass afterwards. You do not need it to run one FP.

| Section | What it settles |
|---|---|
| **O1** | Collecting the reports — what the 2026-08-25 gate actually did, minute by minute |
| **O2** | Recovering a report that never arrived |
| **O3** | Reading a subagent's state without guessing |
| **O4** | What an agent costs, and how many fit — the fan-out ceiling and the three days that set it |
| **O5** | The self-audit log — the five questions and every dated answer |
| **O6** | Costing a pass after the fact, from the transcripts |

## O1. Collecting the reports — what the 2026-08-25 gate actually did

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
- **The 2026-08-21 loss remains unexplained and is history**, never reproduced. §O2 stays as a
  recovery path; do not design a run around the fear.

**What the orchestrator does:**

1. **Act on the first arrival**, and consolidate as you go.
2. **Check what you already hold before relancing.** A relance costs a duplicate at best and a re-run
   of real engine and network time at worst.
3. **Ask only when a report is genuinely absent**, then §O2, then — last — a re-run.
4. **Stop the task once its report is in.** Not for speed: so that nothing wakes it afterwards, and
   so the run's own measurement stays readable.

**And read the ledger's figures for what they are.** It reads subagent transcripts and **cannot see
the orchestrator's session**, so none of its numbers is the requester's wait. Its `worst wait` column
is worth reading — it names the agent that sat longest with nobody coming — but with both traps in
mind: **0.0 also means "nobody ever came back"**, since the wait after a transcript's last line
cannot be measured, and a **large value may be a dead tail after the gate shipped** rather than
anybody waiting. Cross-check against the orchestrator's own timeline before calling either a defect.

## O2. Recovering a report that never arrived

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

## O3. Reading a subagent's state without guessing

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


## O4. What an agent costs, and how many fit

**Isolation and parallelism pull against each other, and DRIVING.md §D1 only argues one side.** Everything
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


## O5. These instructions are provisional — verify them, and correct them

**this annex is written from a single run.** One incident, one machine, one day (2026-08-21). Its remedies
work, but its picture of *why* is incomplete by construction.

> The sentence that stood here until 2026-08-27 said the gap between §O1's symptom and the official
> documentation was unresolved. It is resolved: delivery works, and §O1 no longer argues otherwise.
> What follows is a **dated audit log**, kept as written — some of its notes now point at text that
> has been replaced, and that is the nature of a log rather than a defect in it.

**So the next HP run carries a second job: audit this section against what it actually observes.**
Not as a chore at the end — as part of the run, because the run is the only experiment that can
settle any of it.

Answer these, and write the answers down:

> **Audit of 2026-09-04 (US-37, seven subagents: three FPs, then path 0, then the full HP suite).**
> Delivery worked **7 of 7**, unprompted. §O1 stays closed, now across seven consecutive suites, and
> §O2 stays **unexercised** an eighth time. §O4's cap of **2** was respected and **the machine did
> not freeze** — a second full suite under the rule. One deliberate scheduling choice worth keeping:
> the two scenarios that spend engine time are HP-01 and HP-03, so they were **not** paired; HP-01
> ran beside HP-02 (which analyses nothing), and HP-03 took the slot HP-02 freed. The cap says how
> many, not which — pairing the two expensive ones wastes the cap's whole point.
>
> **The FPs used one worktree per STATE, not merely per agent** — a `-before` worktree at the
> integration branch and the feature worktree beside it, so a single agent could drive two instances
> of the app, one on each commit, and diff what the screen said. That is what turned three "identity"
> Feature Paths into real evidence: 12 recaps compared byte-for-byte, and on one Game the whole
> `<main>` character-for-character. It costs a `git worktree add` and three `node_modules` symlinks.
>
> **Two traps repaid, both new enough to record:**
> - **A `nohup … &` launched from a Bash tool call dies with the shell at the tool's 2-minute
>   timeout.** Hit by path 0 and by HP-01. What it launched (the app, the import) survives server-side,
>   so the run is recoverable by re-reading the screen from a fresh CDP session — but a *polling loop*
>   killed mid-flight hands back a partial reading that looks like a finished one. Detach with `setsid`,
>   or split the drive across several calls.
> - **In `Détaillé` the Analyse move list has MORE children than plies** — the phase ribbons
>   ("DÉBUT DU MILIEU DE PARTIE", "DÉBUT DE LA FINALE") are `<li>`s, 47 for 45 plies. A driver mapping
>   `index + 1 → ply` reads the wrong Move, and HP-03 briefly recorded a flagged **opponent** Move on
>   that basis. The trap is **asymmetric**: the reading route's list has no ribbons and maps 1:1. Key
>   on the SAN text, not the index. Same family as the `[data-square]` fact.
>
> Also observed, smaller: `attach()` returns a session carrying `close`, **not** `stop` (only
> `launchBrowser`'s does) — a teardown written by symmetry throws; `selectProfile` leaves the browser
> on `/profiles`, so a `gameRows()` straight after returns **0** and reads exactly like an empty list;
> piping a driver script to `head` kills it by SIGPIPE **before** it writes its results, losing a whole
> pass; and `restoreSnapshot` refuses a target whose leftover `-wal` still holds frames, so delete the
> target's sidecars first.
>
> Driver-produced false findings: **five**, every one caught by re-measuring, none reaching a report as
> a defect. The one worth naming is not a driver bug at all: an FP found the displayed Drift a tenth
> below its own exact arithmetic on 4 Games of 12, and nearly filed it — the panel shows the Drift as
> the **difference of the rounded parts** so that `flagged + drift = lost` holds *on screen*, and the
> code says so. "Do not presume the app is wrong" earned its place again.
>
> **A finding about the SUITE, and it is the same lesson as the entry below, recurring.** HP-01's step
> 10 still required the `Review mode` to persist across a reload and across Games — a rule **US-28
> withdrew**, and which step 9 of the same scenario had already been updated to contradict. The
> scenario disagreed with itself for a whole release and nothing failed loudly, because the stale
> clause described a behaviour that had simply become impossible. Rewritten in this run, and the
> assertion came out **stronger**: it now asserts the reset rather than the persistence. The rule
> stands and deserves restating: **a story that withdraws a rule owes the permanent suite a pass** —
> and grepping the suite for the withdrawn behaviour costs minutes, where finding it costs a release.
>
> A second-order consequence of the same withdrawal, for `theme-pass.md` rather than for a scenario:
> since every review opens **Unaided**, the theme pass audits `/analyse` with no curve, no advantage
> bar and no severity glyph unless its opener **raises the Game to a level and waits for the review
> fieldset to render**. HP-01 hit it (its opener clicked Détaillé before the fieldset existed) and
> closed the hole with four supplementary readings rather than reporting the cue as verified; HP-03
> pinned its opener to a Game in `Détaillé` and asserted the curve was present **before** auditing.
> That second shape is the one to copy. It is DRIVING.md §D2's "the pass does not choose the Game — you do",
> one level deeper: since US-28 the right Game is no longer enough.

> **Audit of 2026-09-04 (US-28/US-29, five subagents: three FPs then path 0 then HP-03).** Delivery
> worked **5 of 5**, unprompted, each report arriving twice — §O1 stays closed, now across six
> consecutive suites. §O2 stays **unexercised**, a seventh time. Two FPs ran **concurrently** (the
> §O4 cap of 2 on this 8-thread machine), each from **its own git worktree** rather than the shared
> checkout — a shape DRIVING.md §D1 does not describe and which removed the concern its last bullet raises
> about `namesMe` matching a sibling by directory: with one worktree per agent the directory proof is
> exact again. **The machine did not freeze.** Worth knowing: a worktree needs its three
> `node_modules` symlinks before anything runs, and editing client source while another agent drives
> the app is a real hazard — the Vite dev server hot-reloads, so the app under test changes underfoot.
> That is what the worktrees were for, and it is not written anywhere else.
>
> Driver-produced false findings: **four**, every one caught by re-measuring, none reaching a report
> as a defect. Two are new and specific enough to record: a US-29 tint read as missing because the
> driver measured `color`, which is deliberately the SAME constant ink for all five values while the
> tint is `background-color`; and `href.includes("confrontation")` matching the nav link
> `/confrontation` instead of `/analyse/<id>/confrontation`, which produced a clean "the screen never
> rendered" red. The other two are re-runs of known shapes (a stale Chrome `SingletonLock` in a reused
> `--user-data-dir`, and a settle race on a table rendering ~1 s after the Profile is selected).
>
> **One absence probe was taken at the wrong ply**: `[data-bar="winning-chances"]` only exists on a
> ply carrying an annotation, so probing at ply 0 reports "no advantage bar" on a Détaillé page that
> has one. Same family as the in-page drill-down of 2026-08-31 — the state you assert absence over
> has to be the state where presence was possible.
>
> **And a finding about the SCENARIOS rather than the run**: HP-03 and HP-01 both leaned on a rule
> US-28 withdrew (the `Review mode` remembered across Games). HP-03's step 12 opened a Game "on
> Détaillé without being asked" — a precondition that no longer exists, which would have made the
> step untestable rather than red. Rewritten before the run, and the assertion came out stronger. The
> lesson generalises: **a story that withdraws a rule owes the permanent suite a pass**, because a
> scenario whose precondition has quietly become impossible does not fail loudly.

> **Audit of 2026-08-31 (US-22, the full HP suite: path 0, then three scenarios two at a time).**
> Delivery worked **4 of 4**, unprompted, each report arriving **twice** — once by the subagent's own
> `SendMessage` and once as the completion notification. No relance, no transcript recovery: §O2
> stays unexercised, now across four consecutive suites. The **private-browser default held again in
> the parallel case** — zero page thefts, zero port-guard trips, across four agents of which two ran
> concurrently. §O4's cap of **2** on this 8-thread machine was respected and **the machine did not
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
> Two isolation claims were **corrected rather than noted**, both in DRIVING.md §D1: `namesMe` proves ownership
> by directory, which on a shared worktree matches every sibling; and `pgrep -f`/`/proc` scans match
> the very shell running them. Two library holes were closed in the same run — `restoreSnapshot` was
> writing to the requester's protected database, and a wedged CDP socket took the teardown with it.
>
> **Audit of 2026-08-24 (US-16a, five consecutive single-subagent FP runs).** Delivery worked **5 of
> 5**, unprompted, every report arriving **twice** — once by the subagent's own `SendMessage` and once
> as the completion notification, identical content. No relance was needed and no transcript recovery
> was needed, so §O2 stays **unexercised**. `SendMessage` **resumed a completed subagent** to
> re-verify one fixed step, which was markedly cheaper than dispatching a fresh agent: it still knew
> its ports, its database copy and its browser. The private-browser default held — **zero page
> thefts** across all five runs, though each was a single agent, so these runs say nothing new about
> the parallel case. The `npx` grandchild listener was confirmed on **every** run, both servers each
> time. Two isolation claims were corrected in DRIVING.md §D1 rather than merely noted: the colour-scheme
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
  identical content. Three consecutive runs. The belt-and-braces instruction (now in the skill's §8) is what
  produces the duplicate; it is worth the cost, but expect the double delivery rather than reading
  the second copy as a second report. **2026-08-24 (full suite): 4 of 4, every one delivered twice.** The
  question stays closed.)*
- **Did the `SendMessage`-on-idle relance work?** For how many agents? *(2026-08-23: **not needed
  once** — nothing to relance. Separately confirmed the same day that `SendMessage` **resumes a
  completed subagent** with its environment knowledge intact: the games-table FP agent was sent back
  to re-verify one failed step on a new commit rather than a fresh agent being dispatched. That is
  the cheap path after a fix — it already knows its ports, its database copy and its browser.)*
- **Was transcript recovery needed at all?** If yes, was the path in §O2 still correct?
  *(2026-08-23: **not needed**, twice over. The path is therefore still **unverified** since it was
  written — the one claim in §O2 nobody has exercised. Do not delete it, but do not trust it blind
  either: check the directory exists before relying on it in an emergency. **2026-08-24: not needed
  a third time**, so §O2 stays unexercised. This run's orchestrator was handed each subagent's
  transcript path directly by the harness, which is a likelier recovery route than §O2's glob — but
  it is equally unexercised, so neither is a promise.)*
- **Do the isolation findings still hold** — the orphaned listener, `emulate` reloading the
  document, the shared browser stealing the selected page? *(2026-08-23: the orphaned listener and
  the page theft both hold and are **worse** than they were written; the theft is now the default
  expectation on a parallel run, which is why DRIVING.md §D1 makes a private browser the default rather than
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
  about it. The first version of §O1 asserted a confident cause that the documentation
  contradicted; the observation was sound, the explanation invented. Report the symptom and the
  cure, and leave the cause open until something actually demonstrates it.

> **Update 2026-08-27 (US-18 slice 05).** §O1 was rewritten in replacement, and the questions below
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


## O5b. A dispatched subagent cannot invoke a skill — inline what it needs

Measured 2026-09-04, on the fresh-agent trial: a subagent given a real ticket found that
`/verify-factory`, `/implement`, `/to-us`, `/to-spec`, `/to-tickets`, `/build-factory` and
`/grill-with-docs` were **not in its available-skills list**. It could *read* `SKILL.md` and it did,
executing the probes by hand — which worked **only because those probes are written as runnable
shell**, verbatim, rather than described in prose.

Two rules follow, and the second is the one that generalises:

- **A dispatch that depends on a skill must inline what that skill would have done** — the commands,
  the ports, the state, the report shape. That is why the dispatch checklist (the skill's §8) pins
  facts rather than saying "follow the runner".
- **Write a check as a command, not as an instruction.** A probe an agent can paste is a probe an
  agent can run when the skill that owns it is out of reach. Every `L*` check in `verify-factory` is
  written that way on purpose, and this run is the evidence that the choice pays.

The same run also reproduced, on the first try, the failure the runner documents: a reviewer subagent
finished, its transcript went quiet, and **no completion notification arrived**. The documented
`SendMessage` recovery worked. §O1's "delivery works" therefore stands for the *scenario* fan-out and
is **not** a promise about every nested dispatch — a subagent's own subagent is a case nothing here
had observed before.

## O6. Costing a pass after the fact, from the transcripts

**A pass is measured retroactively, and it is free.** Subagent transcripts carry **one timestamped
line per message**, to the millisecond:

```
~/.claude/projects/<project-slug>/<session-id>/subagents/agent-*.jsonl
```

So the cost of a suite — including one run days ago — is reconstructed without replaying it. No
repo script can measure what actually costs: the time sits in the agent↔tool round trips and in
model generation, not in the app. Believing you must "instrument" the run leads to writing useless
code and paying a 40-minute pass for a figure that already exists on disk.

**Classify *every* interval, never subtract.** Take each gap between two consecutive lines and
attribute it by (type of the previous line → type of the next), so the buckets sum to **100 % of the
wall**:

| Bucket | The interval that follows |
|---|---|
| `tools` | a `tool_use` → its `tool_result` |
| `composition` | generating a message that carries a call |
| `analysis` | generating a message of reasoning after a result |
| `report` | generating the final report |
| **`inert wait`** | a text message — the agent handed control back and nobody came |

**The trap, paid for once:** computing *agent time = wall − tool time*. It yields a confident wrong
number — 78 % attributed to the agent when **56 % of the wall was inert wait**, and the two counts
did not reconcile (14.4 + 14.5 ≠ 65.5). **If the buckets do not sum to the wall, the decomposition
is wrong.** Check the sum before stating a percentage.

Two caveats to state alongside the figures: `composition` includes API latency and queueing, which
are not separable; and the **content** of reasoning blocks is not persisted — you measure how long
the analysis took, never what was in it.

`host/run-ledger.mjs` (see `DRIVING.md §D2`) does this for a session; `--every` costs every subagent
of a session rather than only the pass inside it. Read its `worst wait` column with §O1's two traps
in mind.
