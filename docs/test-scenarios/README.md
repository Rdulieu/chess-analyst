# Happy Path inventory

Curated, permanent agentic-test suite (apex of the pyramid). Run at the
`integration → develop` MR (human decision) via `/agentic-tests HP`. Format:
`.claude/skills/agentic-tests/SCENARIO-FORMAT.md`. Journeys use the domain terms
from `CONTEXT.md`.

**At most 3 HP.** To add a 4th: merge two, drop a non-critical one, or graft a
drive-by onto an existing HP.

| ID | Title | Covers | Status |
|---|---|---|---|
| HP-01 | Import and explore my chess.com history | Import, Game, Move, Position | active |
| HP-02 | Explore my move habits | Move habit, Position, Move, Import | active |
| HP-03 | Spot my weak openings | Weak opening, Opening, Win rate, Import | active |

> The `Covers` column is a summary; each scenario's own `covers:` frontmatter is the source of
> truth and has drifted ahead of it before. Check the files, not this table.

## Running the suite economically

A full suite run is dominated by two costs — the real engine and the real network — and past runs
have wasted more time than either. These rules are what a run costs *unnecessarily* if ignored.
None of them trades away what is under test; anything that would is listed in "What not to trim".

**Never poll work the harness already reports.** The single largest waste measured to date: a
2026-08-13 run spent **~8 minutes of a 25-minute suite** re-querying an analysis pass that had
already completed on the first check. A backgrounded command re-invokes the agent when it exits —
wait for that. If a readout must be watched, poll the status endpoint and break on `running:false`,
never on a fixed number of iterations.

**Pick the shortest Game for the analysis pass.** HP-01 step 9 asserts that a pass completes, that
its confirmation is exact, and that `/danger` populates — never that it covered a long Game. Taking
whichever Game happens to be first cost 78 Positions (~10 min at depth 16); selecting the Game with
the fewest half-moves roughly halves that. Selection by characteristic is already the suite's rule —
apply it here too.

**Snapshot the database instead of re-importing.** Each scenario must start from its own pristine
state, but "pristine" does not require a second network round-trip when two scenarios want the
*same* state. HP-02 and HP-03 share preconditions exactly (`DudulSmash`, 2026/06, clean). Import
once, copy the SQLite file aside, and restore it by file copy for the second — each scenario still
runs on untouched data. **Stop the server before copying or deleting the file**: SQLite keeps
serving a deleted inode, so a wipe on a running server silently leaves the old data in place.

**Wait on conditions, not on clocks.** Fixed sleeps sprinkled through a driver add up to tens of
seconds per run and are simultaneously too slow and too flaky. Wait for the element or the state.

### What not to trim

- **Do not lower the engine depth.** `Inaccuracy`/`Mistake`/`Blunder` thresholds derive from
  depth-16 winning chances (CONTEXT.md); a shallower run no longer tests the same thing.
- **Do not swap in a fixture archive.** HP runs exist to exercise the real chess.com contract; that
  is the whole reason they are slow and run once, at the gate.
- **Do not reuse the state another scenario left behind.** Even when it looks identical, a scenario
  that never starts clean cannot catch an ordering or precomputation side effect.
- **Do not report a slow or odd measurement as a finding without re-measuring.** Two "defects" in
  the 2026-08-13 run were the driver's fault, not the app's: a control counter that also counted
  candidate buttons, and a row parser fooled by `textContent` concatenating table columns with no
  separator. Re-measure, then report.
