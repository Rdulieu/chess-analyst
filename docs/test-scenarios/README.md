# Happy Path inventory

Curated, permanent agentic-test suite (apex of the pyramid). Run at the
`integration → develop` MR (human decision) via `/agentic-tests HP`. Format:
`.claude/skills/agentic-tests/SCENARIO-FORMAT.md`. Journeys use the domain terms
from `CONTEXT.md`.

**At most 3 HP.** To add a 4th: merge two, drop a non-critical one, or graft a
drive-by onto an existing HP.

**[Path 0](./path-0-bootstrap.md) is a prerequisite, not a fourth journey, and sits outside the
cap.** It is run **first, once per suite run**: it creates the reference `Profile`, imports the
reference range against the real chess.com API and leaves two database **snapshots** the three
scenarios restore by file copy. The cap protects against a sprawling suite of user journeys; a
state-building step is not a journey of value, and it asserts only that the state it produces is
the state it claims. Since US-11 no scenario can start from nothing: every screen is about a
`Profile`, so one has to exist before any journey begins.

Each HP still runs **independently** — each restores a snapshot into its **own** database file and
starts from untouched data. What path 0 removes is a repeated network round-trip, not a clean start.
HP-01 restores the **empty-history** snapshot (it imports for real: that is its subject, and its
"82 imported / 0 already present" is unassertable against a populated database); HP-02 and HP-03
restore the **imported** snapshot.

| ID | Title | Covers | Status |
|---|---|---|---|
| path 0 | Bootstrap: the reference Profile and its history | Profile, Import, Monthly import, Game | prerequisite — **not an HP** |
| HP-01 | Import and explore my chess.com history | Profile, Import, Game, Move, Position, Theme | active |
| HP-02 | Explore my move habits | Move habit, Position, Move, Profile, Theme | active |
| HP-03 | Spot my weak openings | Weak opening, Opening, Win rate, Profile, Theme | active |

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
carrying real counters; HP-02 sees the explorer after it has been driven, arrows on the board; HP-03
sees the weak-opening highlight. HP-02 and HP-03 see `/danger` in its empty state, deliberately — an
empty state is a rendered screen too, and so is a Profile page whose history is still empty.

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
copy on a running server silently leaves the old data in place.

The real chess.com contract is therefore exercised **once per suite run** in path 0, plus HP-01's own
import — which is HP-01's subject, not a duplicate.

**The snapshot does not carry the current-Profile selection.** It lives client-side, not in the
database (ADR-0014). Every scenario selects `DudulSmash` as its own first step, which is what the
suite asserts anyway: a scenario that never selected a Profile has not shown that the banner names
the right one.

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

**Wait on conditions, not on clocks.** Fixed sleeps sprinkled through a driver add up to tens of
seconds per run and are simultaneously too slow and too flaky. Wait for the element or the state.

### What not to trim

- **Do not lower the engine depth.** `Inaccuracy`/`Mistake`/`Blunder` thresholds derive from
  depth-16 winning chances (CONTEXT.md); a shallower run no longer tests the same thing.
- **Do not swap in a fixture archive.** HP runs exist to exercise the real chess.com contract; that
  is the whole reason they are slow and run once, at the gate.
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
