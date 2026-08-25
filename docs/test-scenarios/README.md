# Happy Path inventory

Curated, permanent agentic-test suite (apex of the pyramid). Run at the
`integration → develop` MR (human decision) via `/agentic-tests HP`. Format:
`.claude/skills/agentic-tests/SCENARIO-FORMAT.md`. Journeys use the domain terms
from `CONTEXT.md`.

**At most 3 HP.** To add a 4th: merge two, drop a non-critical one, or graft a
drive-by onto an existing HP.

> **Done at US-16b** (2026-08-25), and recorded because the shape of the suite is not obvious from
> the files alone: the former HP-02 (*move habits*) and HP-03 (*weak openings*) were **merged** into
> today's [HP-02](./HP-02-read-my-aggregates.md). They opened on the same sentence, restored the same
> snapshot, and both asserted *shape and internal consistency rather than fixed numbers* — what was
> duplicated was the preamble, not the journeys, so the merge cost no assertion. The freed slot went
> to [HP-03](./HP-03-read-blind-and-confront.md), *read a Game blind, seal, confront*, because a
> Happy Path carries a core value and US-16a was only ever a **graft** onto HP-01 (step 9b) for want
> of the `Confrontation`. The cap was not raised.

**[Path 0](./path-0-bootstrap.md) is a prerequisite, not a fourth journey, and sits outside the
cap.** It is run **first, once per suite run**: it creates **three** reference `Profile`s — one that
owns the reference chess.com range, one that owns nothing, and one on **lichess.org** (`Metalyst`)
owning its own real history — imports against the real chess.com **and** Lichess APIs, and leaves
two database **snapshots** the three scenarios restore by file copy. The cap protects against a sprawling suite of user journeys; a
state-building step is not a journey of value, and it asserts only that the state it produces is
the state it claims. Since US-11 no scenario can start from nothing: every screen is about a
`Profile`, so one has to exist before any journey begins.

Each HP still runs **independently** — each restores a snapshot into its **own** database file and
starts from untouched data. What path 0 removes is a repeated network round-trip, not a clean start.
HP-01 restores the **empty-history** snapshot (it imports for real: that is its subject, and its
"82 imported / 0 already present" is unassertable against a populated database); HP-02 and HP-03
restore the **imported** snapshot. HP-03 then runs an `Analysis pass` of its own on two short Games —
it is the only scenario besides HP-01 that spends real engine time, and it has to: a `Confrontation`
set against a fixture verdict would assert nothing about the method.

| ID | Title | Covers | Status |
|---|---|---|---|
| path 0 | Bootstrap: three reference Profiles, two Platforms, two histories | Profile, Platform, Import, Monthly import, Game, Time control category | prerequisite — **not an HP** |
| HP-01 | Import and explore my chess.com history | Profile, Platform, Import, Game, Move, Position, Personal analysis, Theme | active |
| HP-02 | Read my aggregates | Move habit, Opponent reply, Weak opening, Opening, Win rate, Position, Move, Profile, Board orientation, Theme | active |
| HP-03 | Read a Game blind, seal it, confront it | Personal analysis, Declared severity, Key moment, Note, Confrontation, Counted Move, Drift, Review mode, Analysis pass, Search regime, Profile, Theme | active |

> The `Covers` column is a summary; each scenario's own `covers:` frontmatter is the source of
> truth and has drifted ahead of it before. Check the files, not this table.

## Screen coverage, and the theme pass

Each of the three scenarios **ends with the same final step**: a walk of the navigation across all
**eight** screens, in the light theme and then under an emulated dark preference. That step is
written once, in [`theme-pass.md`](./theme-pass.md), and referenced by the three — three copies of
one assertion list drift, and the point of the pass is that the three scenarios apply the *same*
rules to the state each of them built. **`theme-pass.md` is the only place the inventory is edited**;
do not copy its assertions back into the scenarios.

It exists for two reasons at once. A stylesheet is only observable on a rendered screen, so US-13's
dark theme has nowhere else to be validated. And it closes a coverage hole that predates it: before
US-13, **Stats was visited by no HP** and Positions dangereuses only as a drive-by — a theme pass
that never sees a screen proves nothing about it. Every screen is now visited by all three
scenarios, in both themes, and the journeys stay journeys of value rather than becoming coverage
sweeps.

Since US-11 the inventory is **eight** screens, not six: `/profiles` and `/profiles/:id` joined it
and **none was removed** — "Mes parties" stays, it merely lost the import form, which moved onto the
Profile's page. The pass costs four more audits per scenario.

The three passes are not redundant: each audits the eight screens **in its own scenario's state**.
HP-01 sees a populated `/danger`, two analysed Games, a real `Evaluation curve` and a Profile page
carrying real counters. HP-02 sees the explorer after it has been driven — arrows on the board — and
the weak-opening highlight, the two duties it inherited from the pair it replaces; its state analyses
nothing, so it is the pass that sees `/danger` **empty**, deliberately, an empty state being a
rendered screen too. HP-03 analyses two Games of its own, so it audits `/danger`, the
`Evaluation curve` and the advantage bar **populated**, and it is the **only** pass that reaches the
reading route and the `Confrontation` at all — including the confusion matrix, the one table on that
screen where a colour ramp could quietly replace the information.

The cap of **at most 3 HP** holds: the theme is not a journey, so it costs one step per scenario, not
a fourth scenario.

## Running the suite economically

A full suite run is dominated by two costs — the real engine and the real network — and past runs
have wasted more time than either. These rules are what a run costs *unnecessarily* if ignored.
None of them trades away what is under test; anything that would is listed in "What not to trim".

**Never poll work the harness already reports.** The single largest waste measured to date: a
2026-08-13 run spent **~8 minutes of a 25-minute suite** re-querying an analysis pass that had
already completed on the first check. A backgrounded command re-invokes the agent when it exits —
wait for that. If a readout must be watched, poll the status endpoint and break on `running:false`,
never on a fixed number of iterations.

**Pick the shortest Games for the analysis pass.** HP-01 step 9 asserts that a pass completes, that
its confirmation is exact, and that `/danger` populates — never that it covered a long Game. Taking
whichever Game happens to be first cost 78 Positions (~10 min at depth 16); selecting by fewest
half-moves roughly halves that. Selection by characteristic is already the suite's rule — apply it
here too.

Since US-10b the step analyses **two** Games, not one: a `Danger position` must be *recurring*
(reached ≥ 2), so a single Game leaves `/danger` empty. The rule is **the two shortest Games sharing
the same first Move** — the Position after that Move is common to both by construction, so one
entry is guaranteed. It costs **29 Positions** on the reference dataset, *less* than the single Game
the step analysed before — **~25 s** on the 2026-08-17 run (the "~3.5 min" this paragraph used to
quote predates the native engine backend). Do **not** substitute "the two shortest Games overall": it
selects the same pair here, but only because both answer 1.e4.

**Snapshot the database instead of re-importing — and that is now [path 0](./path-0-bootstrap.md)'s
job.** Each scenario must start from its own pristine state, but "pristine" does not require a
network round-trip per scenario. What used to be a repeated instruction here is a step that is run
once and verified once: path 0 imports the reference range against the real API and leaves an
**empty-history** snapshot (HP-01's clean state, Profile created and no Games) and an **imported**
snapshot (HP-02's and HP-03's). Restore by file copy **into each scenario's own database file** —
never point two scenarios at the shared snapshot, which they would then both write to. **Stop the
server before copying or deleting the file**: SQLite keeps serving a deleted or replaced inode, so a
copy on a running server silently leaves the old data in place. **And checkpoint the WAL before
copying** — the database runs in WAL mode, so a stopped server leaves the data in the `-wal` sidecar
and a plain copy of the `.db` captures almost nothing (2026-08-19: 4 KB of `.db` beside 95 KB of
`-wal`, restoring to a database with no tables). `PRAGMA wal_checkpoint(TRUNCATE)`, then read the
copy back to confirm it holds what you think.

The real chess.com contract is therefore exercised **once per suite run** in path 0, plus HP-01's own
import — which is HP-01's subject, not a duplicate.

**Three Profiles, always, one of them current, one of them on the other Platform.** The suite held exactly one Profile until 2026-08-21,
and that blind spot let a `/profiles` screen ship overflowing its own card by 24px in ordinary use —
green across eight screens and two themes, because the defect needs two rows with one of them
marked "Profil actuel" to appear at all (two rows unselected fit; add the selection and they do
not). More than one Profile is also what US-11 *exists for*: studying other players. So path 0
builds both, at the cost of **one extra chess.com validation request and no import**, and no
scenario may quietly reduce itself to a single Profile. HP-02 goes further and **switches** Profile
mid-run, which is where the partitioning of ADR-0014 stops being an assumption — and HP-03 switches
too, to show that a `Profile` with no sealed reading gets its own screen rather than a summary of
zeros.

Since US-12 a **third** Profile joins them, `Metalyst` on **lichess.org**, and this one is not free:
path 0 imports its full 71-month span against the live Lichess API, which is now the longest single
cost of the run. It buys the only live exercise of the Lichess adapter in the suite, and it is what
lets **HP-01 step 10b** switch Platform and require the banner and every figure to follow — until
US-12 both reference Profiles were chess.com, so an app that spelled "chess.com" into the chrome
unconditionally would have run green. It is a **step, not a fourth HP**: the journey is unchanged,
only the site behind it, and the cap still holds at three.

**The snapshot does not carry the current-Profile selection.** It lives client-side, not in the
database (ADR-0014). Every scenario selects `DudulSmash` as its own first step, which is what the
suite asserts anyway: a scenario that never selected a Profile has not shown that the banner names
the right one.

**Beware what a database copy actually captures.** The suite already says to checkpoint the WAL
before copying (`PRAGMA wal_checkpoint(TRUNCATE)`), and that is not always enough: on **2026-08-24** a
`cp` taken *after* a truncating checkpoint produced a copy whose `evaluations` table read back as
**"database disk image is malformed"**. `sqlite3 <src> ".backup <dst>"` worked where `cp` did not.
Prefer `.backup`; whichever you use, **read the copy back** before trusting it.

**Do not pay for the theme pass twice.** It reuses the state its scenario has already built: it must
trigger no Import, no analysis and no `Profile` creation, and it must not restart the app. Sixteen
navigations on a warm app is the whole budget. Inject `tools/theme-audit.js` once per document and call `themeAudit()` per
screen rather than re-implementing the measurements per scenario; switch the theme with the driver's
media emulation, never by reloading with a different setting.

**Pin the app you are driving, and own your browser.** Measured on the 2026-08-17 run, where two
scenarios ran in parallel: a shared browser had its selected page stolen mid-run repeatedly, and two
actions landed on the *other* agent's app — one of them nearly filling a stranger's import form. Run
each scenario on its own ports and its own `DB_FILE`, guard every injected script with a
`location.port` check, re-assert the viewport and the emulated colour scheme before trusting a
measurement, and drive a browser instance of your own. Likewise, never `pkill` by a pattern that
matches another agent's server — kill your own process by pid.

**Drive React-controlled fields with real events.** The import form's month fields keep their default
value if a driver assigns `value` directly or uses a high-level fill helper on the composite month
control — measured on the 2026-08-19 run, where the range silently stayed on the current month while
the checkboxes took, which would have imported the wrong months and failed the figures for a reason
that has nothing to do with the app. Use the native value setter plus an `input`/`change` event, and
**read the field back before submitting**.

**Wait on conditions, not on clocks.** Fixed sleeps sprinkled through a driver add up to tens of
seconds per run and are simultaneously too slow and too flaky. Wait for the element or the state.

### What not to trim

- **Do not lower the engine depth.** `Inaccuracy`/`Mistake`/`Blunder` thresholds derive from
  depth-16 winning chances (CONTEXT.md); a shallower run no longer tests the same thing.
- **Do not swap in a fixture archive.** HP runs exist to exercise the real chess.com contract; that
  is the whole reason they are slow and run once, at the gate.
- **Do not drop the Lichess Profile, and do not shorten its span.** It is the suite's only live
  Lichess contract, and the 51 empty months in the span are what distinguish *a gap in the history*
  from *a gap in the fetching*. A populated-months-only range would import the same Games and stop
  testing that. **US-17 does not reopen this rule** — it removed the span's *cost* (one export
  request instead of 71) without touching the assertion, and in fact sharpened it: the 51 zeros used
  to mean "51 requests each answered empty", nearly a tautology, and now mean "one stream sliced into
  months yielded 51 zero lines", which is real code with a real way to be wrong. Note also what it does **not** cover: `Metalyst` has no `ultraBullet` and no aborted
  game, so those two rules stay fixture-only — state that rather than implying the run covers them.
- **Do not drop the second Profile.** An empty second Profile is what makes a scoping leak
  observable — a global aggregate shows 82 games for an account that owns none — and what keeps the
  row layout under load. It costs one validation request and imports nothing; there is no cheaper
  version of this assertion.
- **Do not reuse the state another scenario left behind.** Even when it looks identical, a scenario
  that never starts clean cannot catch an ordering or precomputation side effect. A snapshot restored
  by file copy **is** a clean start; a database another scenario has been driving is not.
- **Do not shorten the theme pass to the screens the journey already crossed.** The eight screens
  are the coverage, and the two themes are the point; a pass over four screens in one theme is a
  pass over nothing in particular. The profiles screens are audited **as the scenario left them**,
  empty counters included.
- **Do not report a slow or odd measurement as a finding without re-measuring.** Two "defects" in
  the 2026-08-13 run were the driver's fault, not the app's: a control counter that also counted
  candidate buttons, and a row parser fooled by `textContent` concatenating table columns with no
  separator. Re-measure, then report.
