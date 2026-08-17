# Happy Path inventory

Curated, permanent agentic-test suite (apex of the pyramid). Run at the
`integration → develop` MR (human decision) via `/agentic-tests HP`. Format:
`.claude/skills/agentic-tests/SCENARIO-FORMAT.md`. Journeys use the domain terms
from `CONTEXT.md`.

**At most 3 HP.** To add a 4th: merge two, drop a non-critical one, or graft a
drive-by onto an existing HP.

| ID | Title | Covers | Status |
|---|---|---|---|
| HP-01 | Import and explore my chess.com history | Import, Game, Move, Position, Theme | active |
| HP-02 | Explore my move habits | Move habit, Position, Move, Import, Theme | active |
| HP-03 | Spot my weak openings | Weak opening, Opening, Win rate, Import, Theme | active |

> The `Covers` column is a summary; each scenario's own `covers:` frontmatter is the source of
> truth and has drifted ahead of it before. Check the files, not this table.

## Screen coverage, and the theme pass

Each of the three scenarios **ends with the same final step**: a walk of the navigation across all
six screens, in the light theme and then under an emulated dark preference. That step is written
once, in [`theme-pass.md`](./theme-pass.md), and referenced by the three — three copies of one
assertion list drift, and the point of the pass is that the three scenarios apply the *same* rules to
the state each of them built.

It exists for two reasons at once. A stylesheet is only observable on a rendered screen, so US-13's
dark theme has nowhere else to be validated. And it closes a coverage hole that predates it: before
US-13, **Stats was visited by no HP** and Positions dangereuses only as a drive-by — a theme pass
that never sees a screen proves nothing about it. Every screen is now visited by all three
scenarios, in both themes, and the journeys stay journeys of value rather than becoming coverage
sweeps.

The three passes are not redundant: each audits the six screens **in its own scenario's state**.
HP-01 sees a populated `/danger`, two analysed Games and a real `Evaluation curve`; HP-02 sees the
explorer after it has been driven, arrows on the board; HP-03 sees the weak-opening highlight. HP-02
and HP-03 see `/danger` in its empty state, deliberately — an empty state is a rendered screen too.

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
entry is guaranteed. It costs **27 Positions (~3.5 min)** on the reference dataset, *less* than the
single Game the step analysed before. Do **not** substitute "the two shortest Games overall": it
selects the same pair here, but only because both answer 1.e4.

**Snapshot the database instead of re-importing.** Each scenario must start from its own pristine
state, but "pristine" does not require a second network round-trip when two scenarios want the
*same* state. HP-02 and HP-03 share preconditions exactly (`DudulSmash`, 2026/06, clean). Import
once, copy the SQLite file aside, and restore it by file copy for the second — each scenario still
runs on untouched data. **Stop the server before copying or deleting the file**: SQLite keeps
serving a deleted inode, so a wipe on a running server silently leaves the old data in place.

**Do not pay for the theme pass twice.** It reuses the state its scenario has already built: it must
trigger no Import and no analysis, and it must not restart the app. Twelve navigations on a warm app
is the whole budget. Inject `tools/theme-audit.js` once per document and call `themeAudit()` per
screen rather than re-implementing the measurements per scenario; switch the theme with the driver's
media emulation, never by reloading with a different setting.

**Wait on conditions, not on clocks.** Fixed sleeps sprinkled through a driver add up to tens of
seconds per run and are simultaneously too slow and too flaky. Wait for the element or the state.

### What not to trim

- **Do not lower the engine depth.** `Inaccuracy`/`Mistake`/`Blunder` thresholds derive from
  depth-16 winning chances (CONTEXT.md); a shallower run no longer tests the same thing.
- **Do not swap in a fixture archive.** HP runs exist to exercise the real chess.com contract; that
  is the whole reason they are slow and run once, at the gate.
- **Do not reuse the state another scenario left behind.** Even when it looks identical, a scenario
  that never starts clean cannot catch an ordering or precomputation side effect.
- **Do not shorten the theme pass to the screens the journey already crossed.** The six screens are
  the coverage, and the two themes are the point; a pass over four screens in one theme is a pass
  over nothing in particular.
- **Do not report a slow or odd measurement as a finding without re-measuring.** Two "defects" in
  the 2026-08-13 run were the driver's fault, not the app's: a control counter that also counted
  candidate buttons, and a row parser fooled by `textContent` concatenating table columns with no
  separator. Re-measure, then report.
