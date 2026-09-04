---
id: path-0
covers: [Profile, Platform, Import, Monthly import, Game, Time control category]
---

# Path 0 — Bootstrap: the reference Profiles and their histories

## Goal
Build, once per suite run, the state the three Happy Paths start from: the reference `Profile`
**`DudulSmash`** and the reference range of its real chess.com history, a second `Profile`
**that owns nothing**, and a third `Profile` **on the other `Platform`** — **`Metalyst`** on
lichess.org, with its own real history — captured as **database snapshots** the scenarios restore
by file copy. It is the step that exercises the **real import contract of both Platforms for the
suite**, so the three journeys can be about what they are each for rather than each re-importing
the same months.

> Run against the **real chess.com API** and the **real Lichess API** (no `CHESSCOM_BASE_URL`
> override). This is where the network cost of the suite is paid — and, since US-12, where the
> only live exercise of the Lichess adapter happens.

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

## Why a third Profile, on the other Platform

Because **the `Platform` is a value, not a word** (US-12, ADR-0014), and until 2026-08-21 every
reference Profile in this suite was a chess.com one. The suite could therefore have run green over
an app that spelled "chess.com" into the chrome unconditionally: nothing on screen ever *had* to
change with the Platform, so nothing proved that it does.

`Metalyst` on lichess.org closes that. It is the one place in the suite where the Lichess adapter
meets the **live** API rather than a fixture, and it is what lets [HP-01](./HP-01-import-and-explore.md)'s
final step switch Platforms and demand that **every** figure move with the switch — the assertion
that a hard-coded site name fails and a `Platform`-driven one passes.

**It carries its history into both snapshots**, the empty-history one included. That looks like a
contradiction and is not: "empty history" is a statement about **`DudulSmash`**, whose import is
HP-01's own subject. Were `Metalyst` empty too, HP-01's switch would compare 82 Games against zero
and would pass just as happily against a broken Platform label. Populated, it compares two real
histories on two different sites — and `DudulSmash`'s empty state survives beside it **only if
reads are Profile-scoped**, which is precisely the invariant ADR-0014 asserts. The third Profile
makes the partition observable instead of assumed.

**Known coverage limit.** `Metalyst` has **no `ultraBullet` game and no aborted game**. The rule
folding `ultraBullet` into `bullet` and the rule *keeping* aborted games are therefore exercised by
fixtures only, and never meet the real API anywhere in this suite. Stated here so a reader does not
infer coverage the run does not have; closing it would need a second Lichess reference account,
which is a requester's decision, not the agent's.

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
Profile created, **no Game of its own** — and HP-01 performs its real import on top of it. That
`Metalyst` arrives already populated takes nothing from HP-01 either: its assertions are all
`DudulSmash`'s, and they only hold at all if the reads are scoped. The range is imported
twice per suite run in total (here and in HP-01), which is the floor: HP-01 cannot assert "82
imported, 0 already present" against a database that already holds them.

## Preconditions
- App started locally, talking to the **real** chess.com API and the **real** Lichess API.
- A database file this step owns — path 0 writes the snapshots, it does not run beside a scenario.
- **Two** real chess.com accounts: the creation validates against the live player endpoint, so a
  made-up second username is refused and there is no offline substitute. The second one needs no
  games — nothing is imported into it — but it must exist. Reference accounts for this suite:
  **`DudulSmash`** (the history) and **`Nonomoho`** (the empty one).
- **One** real Lichess account, validated the same way against the live Lichess account endpoint:
  **`Metalyst`** — the Platform reference, and the only account in the suite that is not on
  chess.com.
- Reference range for `DudulSmash`: **2026-05 → 2026-06**, both immutable past months (figures in
  [HP-01](./HP-01-import-and-explore.md)'s Preconditions, which stays the table of record — one
  place, checked against the live API).
- Reference range for `Metalyst`: **2017-10 → 2023-08**, the account's **full 71-month span**, of
  which only **20 are populated**. The empty months are not incidental — they are the point: a
  `Monthly import` line at zero is how the app distinguishes *a gap in the history* from *a gap in
  the fetching*, and 51 of them exercise that distinction against the live API rather than a
  fixture. The span reaches back years and every month in it is immutable, so its figures do not
  drift the way a recent month's would.
- **The Lichess address family is pinned to IPv4 by the app itself** (`server/src/platform/lichess/request.ts`),
  and nothing here needs configuring. It is stated so that a `429` here is not misread: the pin is a
  **determinism choice, not a correctness requirement**, and Lichess does **not** refuse IPv6 —
  that earlier conclusion came from measurements taken in one direction only, and the exact
  opposite reproduced on 2026-08-22 (IPv4 → `429`, IPv6 → `200`, seconds apart) after a reference
  import had bursted over the pinned IPv4. What fits both is a **per-IP throttle on the export
  endpoint, keyed to a recent burst**. So **a `429` on the export here is a "we asked too much too
  recently" finding**, not an address-family one and not a quota one: report it with what ran
  before it. The import now asks **once for the whole range**, so a burst is no longer something a
  nominal run produces.

## Journey
1. Start the app on a fresh, empty database → with no `Profile` yet, the app leads to `/profiles`
   rather than to a screen about nobody.
2. Create the `Profile` from the username `DudulSmash` → chess.com validates it, the Profile is
   listed with the **canonical casing chess.com returned**, and its counters read zero Games.
3. Create a **second** `Profile`, `Nonomoho`, and **import nothing into it** → it is listed beside
   the first, owning zero Games.
4. Create a **third** `Profile`, `Metalyst`, **choosing `lichess.org` as its `Platform`** → Lichess
   validates it and the row names its site, not chess.com. The Platform is chosen on the creation
   form and nowhere else, so this is the one place the choice is made.
5. Open `Metalyst`'s page and import its reference range (**2017-10 → 2023-08**, **all five
   cadences**) from its own import form → the import completes, and the summary reports
   `classical` and `correspondence` games among the figures. This is the **live Lichess contract**,
   and the slow part of the step.
6. **Select `DudulSmash` back** — creating a Profile makes it current, so the suite's standing state
   has to be restored explicitly. The list then holds **three rows, one of them current**, which is
   what every scenario inherits.
7. Stop the server and **take the empty-history snapshot** → a copy of the database file holding
   **all three** Profiles, `Metalyst`'s Lichess history, and **no Game under either chess.com
   Profile**. This is what HP-01 restores; "empty history" names `DudulSmash`'s, which is HP-01's
   own subject — see *Why a third Profile* above.
8. Restart and open `DudulSmash`'s page (`/profiles/:id`) — it is the current Profile, selected at
   step 6 — and import the reference range (2026-05 → 2026-06, Blitz + Bullet) from **its own import
   form** → the import completes and the summary reports the range's figures.
9. Confirm the state is the one claimed → the Profile's counters and the Game list agree with the
   summary, and the two `Monthly import` lines cover the range in order. **`Nonomoho` still owns
   zero Games and `Metalyst`'s count has not moved**: the import went to the Profile it was run from
   and nowhere else (ADR-0014).
10. Stop the server and **take the imported snapshot** → a copy of the database file holding the
    three Profiles, the chess.com range under `DudulSmash`, the Lichess range under `Metalyst` and
    nothing under `Nonomoho`. This is what HP-02 and HP-03 restore — HP-03 then running its own
    `Analysis pass` on top of it, which is why the snapshot carries no analysed Game.

## Checks
### Surface
- Step 2: the Profile appears in the list under chess.com's canonical spelling of `DudulSmash`,
  with `0` Games imported and `0` analyzed, and is marked "Profil actuel" — the first Profile
  created becomes the current one. **Type the username in the wrong case on purpose** (`dudulsmash`):
  the row must read `DudulSmash`, which is the whole point of storing what chess.com returns. A typo
  would have been refused here — that assertion belongs to the slice's Feature Path, not to a
  bootstrap step.
- Step 4: `Metalyst`'s row names **`lichess.org`** while the other two name **`chess.com`** — the
  three rows sit in one list, each spelling its own site. A row that named chess.com here would be
  the hard-coded label this Profile exists to catch.
- Step 5: the import form on `Metalyst`'s page announces the import **depuis lichess.org**, and the
  per-month readout runs over the whole span. The consolidated summary breaks the range down by
  cadence and **`classical` and `correspondence` both appear with a non-zero count** — the two
  categories chess.com never produces, so their presence is the translation working end to end
  against the live API. Record the figures it reports (see *Recorded figures* below).
- Step 5, the empty months: the per-month lines cover **every** month of the span in order,
  **including the 51 with no game, each listed at zero**. A span that silently skipped its empty
  months would be indistinguishable from one that failed to fetch them. Since US-17 this is a
  **stronger** assertion than it was: it used to check that 51 requests each answered empty, which
  is close to tautological; it now checks that **slicing one stream into months** produces 51 zero
  lines, which is new code and the thing most likely to get this wrong.
- Step 5, the request count: the whole span costs **one** export request, not 71 — measured, with
  the instrument below. Without this assertion nothing in the suite tells US-17 delivered from
  US-17 undelivered: the screen looks identical either way, which is the point of the story (the
  month stays the unit of reporting) and exactly why the cost has to be observed instead of read.
- Step 5, the pauses: **no minute-long pause occurs**. The `attente de la plateforme` line must
  never appear. Six of them was the reference run's dominant cost, and one request is not a burst.
- Step 5, the duration: the Lichess import is **timed on its own**, separately from the scenario's
  total, and reported with its delta against the reference (see *Recorded durations*).
- Step 6: the list holds **three** rows, `DudulSmash` marked "Profil actuel" and the other two
  offering "Sélectionner", and **nothing overflows its container** — with a third row the list is
  taller than the pairing that first caught the overflow, so this is the stricter version of the
  same check. `Nonomoho` reads `0 parties · 0 analysées`.
- Step 8: the import form on the Profile's page has **no username field** — the Profile already
  names the account — and the import runs against it.
- Step 9: the consolidated summary reports **82** games fetched and **82** imported over the range,
  `DudulSmash`'s counters read **82** Games imported and **0** analyzed, and the Game list holds 82
  entries. Two `Monthly import` lines, in order: `2026-05` at 28, `2026-06` at 54. On `/profiles`,
  `Nonomoho` still reads **`0 parties · 0 analysées`** and `Metalyst` still reads the count step 5
  recorded.

### Counting the requests — the instrument

The count is what makes this scenario able to observe US-17 at all, so how it is obtained is part of
the scenario rather than left to the runner.

**Put a logging reverse proxy in front of Lichess** and point the app at it with
`LICHESS_BASE_URL=http://127.0.0.1:<port>`. The proxy forwards to `https://lichess.org`. The
**contract under test is still the live one** — real API, real ndjson, real throttle; only the base
URL moved, and that is an already-supported knob (`server/src/platform/lichess/client.ts`). Pin the
proxy's own outbound hop to IPv4 to keep the determinism the app's own pin buys.

Two things the proxy has to get right, both learned by writing one:

- **Log three lines per request, not one**: request-out, response-headers, response-end. A single
  line cannot carry both *first request out* and *last byte in*, and the duration below is exactly
  that interval. One line per request is enough to **count**, not to **time**.
- **Set `Host: lichess.org` on the outbound hop.** Forwarding the caller's own
  `Host: 127.0.0.1:<port>` does not reach the API at all.

The proxy log is also what yields the Lichess import's **own** duration — first request out to last
byte in — which is the figure US-18 needs and which the wall-clock of a UI-driven step cannot give.

> **Do not count connections, and do not use `NODE_DEBUG`.** Both were tried and both lie. Node's
> global agent keeps connections alive, so a connection count reports **1** for a burst of 71
> requests — the exact false green this assertion exists to prevent. `NODE_DEBUG=http` was measured
> directly: three sequential export requests emitted **one** `call onSocket` and **one**
> `createConnection` line, so its output cannot be counted either. Measured on 2026-08-24, on the
> code under test — recorded here so the next run does not re-derive it.

### Recorded durations — step 5, `Metalyst` over 71 months

The reference is the **month-by-month** run, before US-17: the Lichess import took **~3.5 min**, of
which **~2.4 min was pure waiting** across **six one-minute pauses** — `429`s provoked by the burst
of 71 requests, each answered by a one-minute sleep and one replay.

| Figure | Reference (71 requests) | US-17 delivery run (2026-08-24) | This run |
| --- | --- | --- | --- |
| Export requests | 71 | **1** | *measured* |
| One-minute pauses | 6 | **0** | *measured* |
| Lichess import, own duration | ~3.5 min (~210 s) | **33.6 s** | *measured* |
| of which waiting | ~2.4 min (~144 s) | **0 s** | *measured* |
| Scenario total | *not recorded* | *not cleanly measured — see below* | *measured* |

**Report the measured figures and the delta, never "it is faster".** This table is the first real
datum US-18 has: its own entry says plainly that its figures are *deduced, not measured*, so a run
that reports an impression instead of a number hands it nothing. Fill the right column from the run
and state the delta against the reference.

The middle column is the run that delivered US-17, kept here so the figure lives in the repo rather
than only in a pull request: **33.571 s**, request-out `10:34:58.517Z` to last-byte-in
`10:35:32.088Z`, read off the proxy log — **−176 s against the reference, about 6.3× shorter**, with
the six one-minute pauses gone. It measures the export alone and therefore excludes the app's own
PGN parsing and database writes; that is deliberate, since it is the fetching US-18 is about.

Its **scenario total is not a clean measurement** and is not recorded as one: the session driving it
was interrupted mid-run, so its wall clock holds dead time and a restart. The import figure is
unaffected — it comes from the proxy log, entirely before the interruption — and does not need
re-paying to obtain a total. A single uninterrupted run would give one.

### Recorded figures — `Metalyst`, 2017-10 → 2023-08

The live account holds **403** games over the span; the imported count is **lower**, because a
Lichess export carries games the corpus deliberately drops (variants, games from an arbitrary
position — about 5% of this account — games against the computer, and any pace we have no word
for). The imported figure is therefore **measured on the run, not derived from 403**, and recorded
here as the value HP-01's switch step asserts against.

| Figure | Value |
| --- | --- |
| Games fetched over the span | 403 |
| Games imported | 351 |
| of which `classical` | 38 |
| of which `correspondence` | 37 |
| Months in the span | 71 |
| Populated months | 20 |
| Months listed at zero | 51 |

**Reconciling with the grill's figures.** US-12's grilling recorded the *account*: 403 games, of
which 38 `classical` and **64** `correspondence`. The imported corpus holds 38 and **37**. The
`classical` figure carries over untouched and the `correspondence` one does not, which is the
expected shape rather than a discrepancy: **52 games are dropped at import** (variants, games from
an arbitrary position, games against the computer), and correspondence is where the computer
opponents concentrate. The account figure is what Lichess holds; the table below is what *our*
corpus keeps, and only the latter is assertable on screen.

> Filled from the run that builds the snapshot. Every month of the span is immutable, so these do
> not drift; if they ever do, the account changed and the table is re-read, not patched.

### Internals
- Both snapshots are copies of the SQLite file taken with the **server stopped**: SQLite keeps
  serving a deleted or replaced inode, so a copy taken under a running server can capture a state no
  scenario will actually see.
- **A snapshot must hold what it claims, and copying a SQLite database in WAL mode is not a file
  copy.** Measured on the 2026-08-19 run: **4 KB** of `.db` beside **95 KB** of `-wal`, and a plain
  copy of the `.db` alone produced a snapshot with **no `profiles` table at all**. A snapshot that
  restores to an empty database fails every scenario downstream with a precondition error that looks
  like an app defect — so the copy is **read back** before it is used.

  > *How* to take that copy is no longer written here. It is one call of the driver library, named
  > in the `agentic-tests` skill (§5.8). This bullet carried the recipe until 2026-08-27, when the
  > recipe was found to be wrong — a checkpoint can be silently refused, and a copy that reads back
  > clean can still have lost a whole table — and a superseded instruction sitting where the copy is
  > actually performed is the worst place for one to survive.
- The empty-history snapshot holds **three** `profiles` rows — one of them with
  `platform = 'lichess'` — `Metalyst`'s Games and **zero** Games carrying `DudulSmash`'s or
  `Nonomoho`'s id.
- The imported snapshot holds **three** `profiles` rows, 82 `Game` rows carrying `DudulSmash`'s id,
  `Metalyst`'s Games carrying **its** id, **none** carrying `Nonomoho`'s, and no `Evaluation` — the
  analysis pass belongs to HP-01, which runs it on its own restored state.
- `Metalyst`'s Games carry `classical` and `correspondence` in their `Time control category`, and
  **no row carries a category outside the five** — a pace with no word for it is dropped at import,
  never stored under a guess.

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
- **A range over 24 months raises a `confirm()`, and an unhandled one hangs the driver.** The import
  form asks *"Cette plage couvre 71 mois. Continuer ?"* (`client/src/features/import/ImportForm.tsx`).
  The dialog is deliberate — it is the app warning about a long range — but a CDP driver with no
  `page.on('dialog')` handler never gets its injected click back, and the failure looks exactly like a
  hung app: measured 2026-08-24, one wasted 3-minute attempt ending in a `Runtime.callFunctionOn`
  timeout. **Register a dialog handler before submitting, and raise `protocolTimeout`.** This sits
  beside the month-fields note above because it is the same trap in a different guise: the form is
  driven by a human affordance the driver has to answer, not just filled.
- **Snapshot into each scenario's own file.** Scenarios run on their own ports and their own
  `DB_FILE`; restore is a copy **into** that file, never a scenario pointing at the shared
  snapshot, which two scenarios would then write to at once.
- The range's figures were read from the live chess.com API and both months are past. If they
  drift, **re-check the account and update HP-01's table** — the point of anchoring on immutable
  months is to keep the suite assertable on real data.
- **The Lichess span used to be the long pole of the suite**, when its 71 months were fetched one
  month at a time. They are now fetched in **one request** (US-17), which is what the step is
  expected to show; the duration is *measured and recorded* by path 0 itself rather than asserted
  here. It stays a cost paid **once** per suite run — what the snapshots exist to avoid re-paying.
- **Real network dependency**: needs chess.com and Lichess reachable (see the Preconditions — a
  `429` on the export points at a recent burst, not at an address family). A month marked in **échec** or **incomplet** here means
  the snapshot is incomplete and the scenarios restoring it would assert against a partial range —
  re-run path 0 rather than continuing, since a failed month is a legitimate environment finding
  but a poisoned shared state.
