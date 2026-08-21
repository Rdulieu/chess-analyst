---
id: path-0
covers: [Profile, Import, Monthly import, Game]
---

# Path 0 — Bootstrap: the reference Profile and its history

## Goal
Build, once per suite run, the state the three Happy Paths start from: the reference `Profile`
**`DudulSmash`** and the reference range of its real chess.com history, **plus a second `Profile`
that owns nothing**, captured as **database snapshots** the scenarios restore by file copy. It is the step that exercises the **real chess.com
import contract for the suite**, so the three journeys can be about what they are each for rather
than each re-importing the same two months.

> Run against the **real chess.com API** (no `CHESSCOM_BASE_URL` override). This is where the
> network cost of the suite is paid.

## Why a second Profile

Because **one Profile is not the case this story exists for.** US-11 is about studying *other*
players too, so more than one `Profile` is the normal state of the app, not an edge case — and until
2026-08-21 no scenario had ever held two. The suite therefore ran, green, over a `/profiles` screen
that **overflowed its own card by 24px** in ordinary use, the `Supprimer` buttons rendering outside
the frame. Eight screens in two themes reported clean on a visibly broken screen.

The trigger was measured precisely, and it is worth stating because it dictates the shape of this
step: **two rows are not enough — one of them must be the current Profile.** With two rows and
nothing selected the list fits (625 into 625); as soon as one row reads "Profil actuel" while the
other still offers "Sélectionner", the state track has to hold both and the list overflows (635 into
625). Every scenario selects a Profile at its step 1, so a second Profile in the snapshot is
sufficient — and necessary — to exercise it.

It costs **one chess.com validation request**, once per suite run. It imports nothing: an empty
second Profile is enough to catch a scoping leak, because a partitioned read must show *zero* for it
while the other holds the whole range — a global aggregate would show 82 and be caught at once. That
is the cheapest state that makes ADR-0014 observable rather than assumed.

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
- **Two** real chess.com accounts: the creation validates against the live player endpoint, so a
  made-up second username is refused and there is no offline substitute. The second one needs no
  games — nothing is imported into it — but it must exist. Reference accounts for this suite:
  **`DudulSmash`** (the history) and **`Nonomoho`** (the empty one).
- Reference range for `DudulSmash`: **2026-05 → 2026-06**, both immutable past months (figures in
  [HP-01](./HP-01-import-and-explore.md)'s Preconditions, which stays the table of record — one
  place, checked against the live API).

## Journey
1. Start the app on a fresh, empty database → with no `Profile` yet, the app leads to `/profiles`
   rather than to a screen about nobody.
2. Create the `Profile` from the username `DudulSmash` → chess.com validates it, the Profile is
   listed with the **canonical casing chess.com returned**, and its counters read zero Games.
3. Create a **second** `Profile`, `Nonomoho`, and **import nothing into it** → it is listed beside
   the first, owning zero Games. Creating it makes it current, so **select `DudulSmash` back**: the
   list then holds **two rows, one of them current**, which is the state the whole suite inherits —
   see *Why a second Profile* below.
4. Stop the server and **take the empty-history snapshot** → a copy of the database file holding
   **both** Profiles and no Games at all. This is what HP-01 restores.
5. Restart and open `DudulSmash`'s page (`/profiles/:id`) — it is the current Profile, selected at
   step 3 — and import the reference range (2026-05 → 2026-06, Blitz + Bullet) from **its own import
   form** → the import completes and the summary reports the range's figures.
6. Confirm the state is the one claimed → the Profile's counters and the Game list agree with the
   summary, and the two `Monthly import` lines cover the range in order. **`Nonomoho` still owns
   zero Games**: the import went to the Profile it was run from and nowhere else (ADR-0014).
7. Stop the server and **take the imported snapshot** → a copy of the database file holding both
   Profiles, the range under `DudulSmash` and nothing under `Nonomoho`. This is what HP-02 and HP-03
   restore.

## Checks
### UI
- Step 2: the Profile appears in the list under chess.com's canonical spelling of `DudulSmash`,
  with `0` Games imported and `0` analyzed, and is marked "Profil actuel" — the first Profile
  created becomes the current one. **Type the username in the wrong case on purpose** (`dudulsmash`):
  the row must read `DudulSmash`, which is the whole point of storing what chess.com returns. A typo
  would have been refused here — that assertion belongs to the slice's Feature Path, not to a
  bootstrap step.
- Step 3: the list holds **two** rows, `DudulSmash` marked "Profil actuel" and `Nonomoho` offering
  "Sélectionner", and **nothing overflows its container** — that pairing is what the row's constant
  tracks have to fit. `Nonomoho` reads `0 parties · 0 analysées`.
- Step 5: the import form on the Profile's page has **no username field** — the Profile already
  names the account — and the import runs against it.
- Step 6: the consolidated summary reports **82** games fetched and **82** imported over the range,
  `DudulSmash`'s counters read **82** Games imported and **0** analyzed, and the Game list holds 82
  entries. Two `Monthly import` lines, in order: `2026-05` at 28, `2026-06` at 54. On `/profiles`,
  `Nonomoho` still reads **`0 parties · 0 analysées`**.

### Backing store
- Both snapshots are copies of the SQLite file taken with the **server stopped**: SQLite keeps
  serving a deleted or replaced inode, so a copy taken under a running server can capture a state no
  scenario will actually see.
- **Checkpoint the WAL before copying.** The database runs in WAL mode, so stopping the server
  leaves the run's data in the `-wal` sidecar and the main file nearly empty — measured on the
  2026-08-19 run: **4 KB** of `.db` beside **95 KB** of `-wal`, and a plain `cp` of the `.db` alone
  produced a snapshot with **no `profiles` table at all**. Run `PRAGMA wal_checkpoint(TRUNCATE)`
  against the file (or copy the `-wal`/`-shm` sidecars alongside it) and **verify the copy by
  reading it back** — a snapshot that restores to an empty database fails every scenario downstream
  with a precondition error that looks like an app defect.
- The imported snapshot holds **two** `profiles` rows and 82 `Game` rows, **all** carrying
  `DudulSmash`'s id and none carrying `Nonomoho`'s, and no `Evaluation` — the analysis pass belongs
  to HP-01, which runs it on its own restored state.

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
- **The import form's month fields need a real input event.** They are React-controlled, so a
  driver that assigns `value` (or uses a high-level "fill" helper on the composite month control)
  leaves the component's state on its default — measured on the 2026-08-19 run, where the range
  silently stayed on the current month while the checkboxes took. Use the native value setter and
  dispatch `input` (and `change`), then **read the values back before submitting**. Every scenario
  that drives this form is exposed to it.
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
