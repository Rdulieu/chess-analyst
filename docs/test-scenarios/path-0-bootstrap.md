---
id: path-0
covers: [Profile, Import, Monthly import, Game]
---

# Path 0 — Bootstrap: the reference Profile and its history

## Goal
Build, once per suite run, the state the three Happy Paths start from: the reference `Profile`
**`DudulSmash`** and the reference range of its real chess.com history, captured as a **database
snapshot** the scenarios restore by file copy. It is the step that exercises the **real chess.com
import contract for the suite**, so the three journeys can be about what they are each for rather
than each re-importing the same two months.

> Run against the **real chess.com API** (no `CHESSCOM_BASE_URL` override). This is where the
> network cost of the suite is paid.

## Not a Happy Path, and outside the 3-HP cap

Path 0 is **not** a fourth journey and does not consume the cap. The cap protects against a
sprawling suite of user journeys; path 0 is a **state-building step** — it asserts that the state
it produces is the state it claims, and nothing about the value the app delivers. It carries no
`HP-` id for that reason.

**Independence between the HP still holds.** The suite's rule is that no HP depends on another, and
it is intact: each scenario restores the snapshot into its **own** database file and starts from
untouched data. What path 0 removes is a *repeated network round-trip*, not each scenario's clean
start. A snapshot restored by file copy is a pristine state; a state another scenario left behind
is not, and remains forbidden.

**It does not take HP-01's subject.** HP-01 is *about* importing: its empty-state invitation, its
determinate month-by-month readout, its hard consolidated figures and its incremental re-import are
its own assertions and stay there. Path 0 therefore hands HP-01 an **empty-history** snapshot — the
Profile created, no Games — and HP-01 performs its real import on top of it. The range is imported
twice per suite run in total (here and in HP-01), which is the floor: HP-01 cannot assert "82
imported, 0 already present" against a database that already holds them.

## Preconditions
- App started locally, talking to the **real** chess.com API.
- A database file this step owns — path 0 writes the snapshots, it does not run beside a scenario.
- A real chess.com account with games in the range. Reference account for this suite:
  **`DudulSmash`**, range **2026-05 → 2026-06**, both immutable past months (figures in
  [HP-01](./HP-01-import-and-explore.md)'s Preconditions, which stays the table of record — one
  place, checked against the live API).

## Journey
1. Start the app on a fresh, empty database → with no `Profile` yet, the app leads to `/profiles`
   rather than to a screen about nobody.
2. Create the `Profile` from the username `DudulSmash` → chess.com validates it, the Profile is
   listed with the **canonical casing chess.com returned**, and its counters read zero Games.
3. Stop the server and **take the empty-history snapshot** → a copy of the database file holding
   the Profile and no Games. This is what HP-01 restores.
4. Restart, select `DudulSmash` as the current Profile, open its page (`/profiles/:id`) and import
   the reference range (2026-05 → 2026-06, Blitz + Bullet) from **its own import form** → the
   import completes and the summary reports the range's figures.
5. Confirm the state is the one claimed → the Profile's counters and the Game list agree with the
   summary, and the two `Monthly import` lines cover the range in order.
6. Stop the server and **take the imported snapshot** → a copy of the database file holding the
   Profile and its whole imported range. This is what HP-02 and HP-03 restore.

## Checks
### UI
- Step 2: the Profile appears in the list under chess.com's canonical spelling of `DudulSmash`,
  with `0` Games imported and `0` analyzed. A typo would have been refused here — that assertion
  belongs to the slice's Feature Path, not to a bootstrap step.
- Step 4: the import form on the Profile's page has **no username field** — the Profile already
  names the account — and the import runs against it.
- Step 5: the consolidated summary reports **82** games fetched and **82** imported over the range,
  the Profile's counters read **82** Games imported and **0** analyzed, and the Game list holds 82
  entries. Two `Monthly import` lines, in order: `2026-05` at 28, `2026-06` at 54.

### Backing store
- Both snapshots are ordinary copies of the SQLite file, taken with the **server stopped**: SQLite
  keeps serving a deleted or replaced inode, so a copy taken under a running server can capture a
  state no scenario will actually see.
- The imported snapshot holds 82 `Game` rows, all carrying the `DudulSmash` Profile's id, and no
  `Evaluation` — the analysis pass belongs to HP-01, which runs it on its own restored state.

## What the snapshot does *not* carry

**The current-Profile selection.** Which Profile is current is held client-side and persisted in
the browser, not in the database (ADR-0014 — the server stays stateless and every read names its
Profile). Restoring a snapshot therefore restores the Profile and its Games and leaves **nothing
selected**: each scenario selects `DudulSmash` on `/profiles` as its own first step, which is what
the suite asserts anyway — a scenario that never selected a Profile has not shown that the banner
names the right one.

## Cleanup (best-effort)
- Keep both snapshots for the duration of the suite run; they are the run's shared state. They hold
  real imported Games and can be discarded afterwards — path 0 rebuilds them from the network.

## Notes
- **Snapshot into each scenario's own file.** Scenarios run on their own ports and their own
  `DB_FILE`; restore is a copy **into** that file, never a scenario pointing at the shared
  snapshot, which two scenarios would then write to at once.
- The range's figures were read from the live chess.com API and both months are past. If they
  drift, **re-check the account and update HP-01's table** — the point of anchoring on immutable
  months is to keep the suite assertable on real data.
- **Real network dependency**: needs chess.com reachable. A month marked in **échec** here means
  the snapshot is incomplete and the scenarios restoring it would assert against a partial range —
  re-run path 0 rather than continuing, since a failed month is a legitimate environment finding
  but a poisoned shared state.
