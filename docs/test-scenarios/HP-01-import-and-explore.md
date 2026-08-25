---
id: HP-01
covers: [Profile, Platform, Import, Monthly import, Game, Move, Position, Evaluation, Evaluation curve, Danger position, Board orientation, Personal analysis, Declared severity, Note, Key moment, Theme]
---

# HP-01 — Import and explore my chess.com history

## Goal
The Player imports a **range of months** of their real chess.com history **onto a `Profile`**,
from that Profile's own page, follows its progress month by month, reads a summary of what was
retained — overall and per month — and can open an imported Game and step through its Moves on the
board. This is US-2's core value (replacing the fixture with the Player's real Games), widened by
US-9 from a single month to a range and pointed at a `Profile` by US-11.

> Run against the **real chess.com API** (not a fixture archive). This is the slow,
> network-dependent, run-once validation — the definitive check that the true
> chess.com contract works end to end.
>
> **This scenario imports for real, and that is its subject.** It restores
> [path 0](./path-0-bootstrap.md)'s **empty-history** snapshot — the reference `Profile`, no Games
> — so it never re-pays the Profile's creation, and then performs the import itself. Its hard
> figures ("82 imported, 0 already present") are only assertable against a history that is not
> there yet, so it cannot restore the imported snapshot the other two use.

## Drive-by
- `Platform` (US-12, graft — no fourth HP): the suite holds Profiles on **both** sites, and step
  10b switches between them, requiring every figure and the banner to follow the `Platform`.
- `Profile` scoping (US-11): the `Import` is an operation **on one Profile**, run from its own page
  with no username field, and every screen afterwards speaks of that Profile, named by the chrome's
  banner.
- Import summary: per-category breakdown and the Player's win/draw/loss tally, consolidated
  over the range.
- Determinate progress **counted in months** while the Import is in flight.
- One `Monthly import` line per month of the range, in order, a month with no games included
  at zero.
- Board navigation (Previous / Next / jump-to-Move) on an imported Game.
- Game header (US-10a, graft — no dedicated HP; the 3-HP cap is already spent): an opened Game
  names both players with their colour, marks which one is the Player, and states the result, the
  date, the cadence and the `Opening`.
- `Board orientation` (US-10a, graft): a Game is read from the side the Player played. **Both
  colours must be opened** — a run that only ever opens a White Game never exercises the flip and
  would pass just as happily on a broken orientation.
- Incremental Import: replaying the same range adds no duplicate.
- Engine analysis pass (US-4, graft — no dedicated HP; the 3-HP cap is already spent): analyzing
  one imported Game with the real engine marks it "analysée" and the resulting `Danger position`
  view (`/danger`) renders without error.
- `Personal analysis` (US-16a, graft — no fourth HP): the Player writes their **own** reading of a
  Game on a route that shows **nothing** of the engine, **seals** it, and the reading is labelled
  with its `provenance` — read unaided, or read informed. Grafted here because step 9 has just
  asserted that the app "does not start volunteering the engine's verdict" and step 7 has already
  opened a **not-yet-analysed** Game: the exact context US-16a needs, with no preamble to write, and
  **no engine time** owed.
- The stylesheet and the dark theme (US-13): the final step walks all nine screens in both themes.
  This scenario is the one whose state reaches every screen with content, so it is the strongest of
  the three theme passes.

## Preconditions
- App started locally with its single command, on this scenario's own port and its own database
  file, talking to the **real** chess.com API (no `CHESSCOM_BASE_URL` override).
- **Clean data state, restored**: [path 0](./path-0-bootstrap.md)'s **empty-history snapshot**
  copied into this scenario's database file, with the server stopped. It holds the reference
  `Profile`, a **second Profile (`Nonomoho`) owning nothing**, a **third on lichess.org
  (`Metalyst`) carrying its own imported history**, and **no Game under either chess.com
  Profile**, so the empty-state invitation shows and the import counts are predictable. Three
  Profiles is the suite's standing state — see [`theme-pass.md`](./theme-pass.md) for why — so
  step 1 selects one **among three** rather than confirming the only one.

  > `Metalyst` arriving populated is deliberate, and does not soften this scenario's empty start:
  > "no history" is a statement about `DudulSmash`, and it only holds beside a populated third
  > Profile **if reads are Profile-scoped** (ADR-0014). It is also what gives step 10b something
  > to switch *to* — see [path 0](./path-0-bootstrap.md)'s *Why a third Profile*. The Profile's creation and its chess.com validation belong to path 0; this scenario
  starts from the Profile and imports onto it.
- **Nothing is selected on arrival**: the current `Profile` lives client-side, not in the database
  (ADR-0014), so step 1 selects it.
- A real chess.com account with games in the chosen range. Reference account for this
  suite: the Player's username **`DudulSmash`**, range **2026-05 → 2026-06**. Both are
  immutable past months, and both are fully known (checked against the live API on
  2026-08-12), so this scenario asserts **hard figures**, not just shape:

  | | 2026-05 | 2026-06 | range |
  |---|---|---|---|
  | games | 28 | 54 | **82** |
  | blitz / bullet | 24 / 4 | 48 / 6 | **72 / 10** |
  | W · D · L (Player-relative) | 18 · 0 · 10 | 27 · 0 · 27 | **45 · 0 · 37** |

  The account plays **both colours** in this range (2026-06 alone splits 27 as White / 27 as
  Black, read from the local store on 2026-08-13), so step 6b always has a Black-side Game to
  open. Pick the two Games **by their side**, not by their position in the list.

  All standard chess — no variant is filtered out, so "fetched" and "in scope" coincide.
  Note both months happen to contain **no draws**; a `D` other than 0 means the account's
  history changed and the table needs re-checking, not that the app is wrong.

## Journey
1. Open the app and select `DudulSmash` as the current `Profile` on `/profiles` → the Profile is listed with **0** Games imported, becomes the current one, and the chrome's banner names it from then on.
2. Open "Mes parties" with that Profile's empty history → the screen names itself ("Mes parties"), the Player is invited to import, and **there is no import form here**: the invitation leads to the Profile's own page, since importing is an operation on a Profile.
3. Open the Profile's page (`/profiles/:id`), set the range (from 2026-05 to 2026-06) and at least the Blitz and Bullet categories, and start the Import → the form carries **no username field** — the Profile already names the account — a progress readout counted in months runs, then a summary appears.
4. Read the consolidated summary → it reports the total games fetched over the range, a per-category breakdown, how many were newly imported vs already present, and a win/draw/loss tally.
5. Read the per-month lines → one line per month of the range, in order, each saying what that month brought in.
6. See the imported Games listed in the app → the list reads as rows, each row holding its selection control, its description and its analysed state in the same three places.
7. Open one imported Game the Player played **as White** (selecting it in the list navigates to its Analyse page, `/analyse/:gameId`) → a header names both players with their colour and marks which one is the Player, alongside the result, date, cadence and `Opening`; its Position renders on the board, White at the bottom; stepping forward/backward and jumping to a Move updates the Position accordingly. The Game is not analysed yet, so there is nothing of the engine to reveal and **no `Niveau de revue` control** is offered — only the invitation to analyse it.
7b. Go back and open a Game the Player played **as Black** → the same header, now marking the Player on the Black side, and the board is read **Black at the bottom**.
8. Start the same Import again from the Profile's page (same range + categories) → the summary reports the Games as already present, and the Game list gains no duplicate.
9. Reopen the app (reload) → `DudulSmash` is **still the current Profile**: the banner names it without re-selecting, and the scoped screens show its history straight away. The `Review mode` is remembered the same way and has never been changed, so a Game still opens **Unaided** after a reload: the app does not start volunteering the engine's verdict.
9b. **(US-16a) Write my own reading of a Game, and seal it.** Open any imported Game from "Mes
   parties" — its row says **`Aucune lecture`** — and, from its Analyse page, follow **« Écrire ma
   lecture de cette partie »** to the reading route → the board is oriented on the side the Player
   played, the Moves and their notation are there, and **nothing of the engine is**: no
   `Evaluation`, no advantage bar, no `Evaluation curve`, no severity glyph, no `Best line`, and not
   even the `Niveau de revue` control. Step to one of the Player's **own** Moves and declare a
   `Declared severity` on it; write a `Note` saying why; step to another Move and mark it a
   **`Key moment`** → the move list now flags those Moves, the three kinds of mark told apart, and
   « Où j'en suis » states the **coverage** as a count beside its share. Nothing anywhere states a
   score, a justesse or a comparison. Now **seal**: the confirmation **names what it commits** —
   what is written is frozen, and a sealed reading cannot be unsealed — and after confirming, the
   reading carries the instant of its sealing and the label **« Lue à l'aveugle »**. Write one more
   mark → it is accepted and marked **posterior to the seal**, while what was sealed stays readable
   beside it, unchanged. Return to "Mes parties" → that Game's row now reads **`Lecture scellée`**.

   > **Why here.** Step 9 has just asserted that the remembered `Review mode` is Unaided and that
   > "the app does not start volunteering the engine's verdict"; step 7 opened a Game that has
   > **not** been analysed. That is precisely the state US-16a is about, so the graft costs a few
   > navigations and **no engine time at all** — which is also why it sits *before* step 10 rather
   > than after it. Run before any analysis exists, the « Lue à l'aveugle » label is earned by the
   > run rather than merely reported by it.
   >
   > **What this step does not claim.** It checks that the reading route **renders** nothing of the
   > engine and that the provenance is **recorded**; it cannot check that the Player did not look.
   > Nothing can — the app labels a reading, it does not certify one, which is exactly what the
   > glossary refused to promise when it rejected the name *Blind mode*. Assert the display and the
   > label, never a guarantee.
   >
   > It is a **step, not a fourth HP**: the cap stays at three. That merge happened at US-16b, and
   > the freed slot now holds [HP-03](./HP-03-read-blind-and-confront.md) — read a Game blind, seal,
   > confront. **This step is not made redundant by it**: it runs on a Game that has **not** been
   > analysed, where the engine has nothing to hide, while HP-03 runs on one it has fully evaluated.
   > The two prove different things about the same route.

10. (Drive-by, US-4 + US-8 + US-10b) Select the **two shortest Games sharing the same first Move**
   and start the analysis pass on them (real WASM
   Stockfish, depth 16 — allow it real time to finish) → while it runs, a count of **Positions
   evaluated** advances (it does not sit at zero); when it ends, an explicit confirmation states
   how many Games and Positions were covered, and both Games are marked "analysée". Dismiss the
   confirmation → it disappears, and does not come back after a reload. Open "Positions
   dangereuses" (`/danger`) → while it computes, a **text readout announces the computation**
   (never a blank page); it then renders **at least one** `Danger position`, **reached at least
   twice**, and the **initial Position is not among them**. Shape only otherwise (real games, no
   fixed figures expected), each entry being a **card** in a grid that reflows with the window,
   stating its **side to move** and presenting its diagram from that side.

   > **Why two Games, and why "same first Move"**: a `Danger position` is *recurring* (reached ≥ 2,
   > initial Position excluded — CONTEXT.md), so a single Game populates `/danger` with nothing at
   > all. Two Games opening with the same Move share the Position that follows it **by
   > construction** — one guaranteed entry, whatever the account or the range. It is also the
   > **cheapest** rule available: the two shortest such Games cost **~29 Positions**, less than the
   > single shortest Game the step used to analyse (~40). Measured at **~14 s** on the 2026-08-14
   > run — the estimate here read ~3.5 min, some 15x pessimistic, from before the native engine
   > backend. Verified on this suite's
   > reference dataset — re-verified on the reworked range (82 Games, 2026-08-19): of the **5**
   > first-Move groups holding at least two Games (e4 28, d4 34, b3 13, Nc3 3, e3 2), **none** fails
   > to share a Position; the cheapest pair is a 6-ply and a 21-ply Game, both answering 1.e4, and
   > the pass reports **29 Positions** — the figure this step has always quoted. (The count read
   > "6 groups" while the scenario imported 2026/06 alone.)
   >
   Then reopen **whichever of the two Games carries at least one flawed Move of the Player's** (the
   move list and the error tally say which; if neither does, record the curve's error marking as *not
   exercised* rather than red — the step selects the two shortest Games, and a short Game often holds
   no mistake at all) → it opens **Unaided** (US-15a): the Moves and the board, and **nothing** from
   the engine — no glyph, no `Evaluation`, no advantage bar, no curve. Ask the `Niveau de revue`
   control for the **annotated** level → beside its board, in the annotations pane, an `Evaluation curve`
   runs from the starting Position on the left to the last Move on the right; stepping through
   the Moves moves a mark along it, and the Player's own flawed Moves are marked on it by the
   same glyph the move list uses, beside a tally that names the fault in words (`Vos erreurs : 1
   grosse erreur ??` — the category spelled out and the glyph repeated, so the tint is never the only
   cue). Ask it for the **detailed** level → the reviewed Move's own **titled** record appears below
   the board row, and a link beside the board leads to it; the board itself is **whole on arrival** at
   all three levels. Reload → the level asked for is still the one shown, and opening **another** Game
   opens it at that same level without asking again.

   > **Why here and not as a scenario of its own**: the curve needs a Game with real
   > `Evaluation`s, which this step has just produced — it costs one navigation and no engine
   > time. (US-14, grafted; the HP budget stays at 3.)

   > Do not substitute "the two shortest Games **overall**": it is the same pair here, but only
   > because both happen to answer 1.e4 — it would go green for the wrong reason elsewhere.
10b. **(US-12) Switch Platform — from a chess.com Profile to the Lichess one.** On `/profiles`,
    select **`Metalyst`** → the chrome's banner names **`Metalyst (lichess.org)`**, and **every
    figure on screen changes with it**: "Mes parties" lists `Metalyst`'s Lichess history instead of
    `DudulSmash`'s 82 Games, its cadences now include **`classical` and `correspondence`** — two
    categories chess.com never produces — the Profile page's counters read `Metalyst`'s, and the
    analysed count drops back to **0**, since the pass of step 10 belongs to the other Profile.
    Then **select `DudulSmash` back** → every figure returns to what step 10 left, the two analysed
    Games included.

    > **What this step is for.** Both reference Profiles were chess.com until US-12, so nothing in
    > the suite had ever *required* a screen to change with the `Platform`: an app that spelled
    > "chess.com" into the banner unconditionally would have run green. This is the only step where
    > a hard-coded site name fails, and the only place the partition is checked **across**
    > Platforms rather than between two accounts on the same one.
    >
    > It is a **step, not a fourth HP**: the journey has not changed — import, then explore — only
    > the site behind it. The suite stays at **three** Happy Paths.
    >
    > Switching back is not tidiness, it is a precondition: step 11 asserts against the state steps
    > 1–10 built, and it must run under the Profile that owns it.

11. **Theme pass (US-13)** — walk the navigation across **all nine screens** (Mes parties,
    Explorateur, Ouvertures, Positions dangereuses, Stats, **Mes lectures**, Analyse by opening a
    Game, Profils, and the Profile's own page), first in the light theme, then again with the system's **dark preference
    emulated** → every screen is painted in the theme the system asks for, and everything the Player
    must be able to read stays readable in both. **No further Import and no further analysis**: the
    pass reuses exactly the state steps 1–10 built, which is why it is the last step and not a
    scenario of its own.

    > The rules asserted here, the nine screens, the audit tooling and the known-open findings are
    > written once in [`theme-pass.md`](./theme-pass.md) — the same step closes HP-02 and HP-03, and
    > three copies of an assertion list would drift. This scenario's state is the richest of the
    > three (real Games, two analysed, `/danger` populated, and a Profile page carrying real
    > counters), so this is where the pass sees the most.

## Checks
### UI
- Step 1: `/profiles` lists **three** Profiles — two on chess.com and `Metalyst` on lichess.org, each row naming its own site; `DudulSmash` reads **0** Games imported and **0** analyzed, and selecting it marks its row "Profil actuel" in words while the other still offers "Sélectionner". Every scoped screen afterwards carries the banner naming `DudulSmash`. Nothing on the list overflows its container — the pairing of those two states in one column is what used to.
- Step 2: "Mes parties" carries its own heading, shows an invitation to import and **no import form** — the form is not on this screen since US-11, and the invitation leads to the Profile's page. With the restored empty history no Games are listed.
- Step 3: the Profile's page (`/profiles/:id`) names the Profile and carries the import form: a first and a last month, category checkboxes and an Import button, and **no username field** at all. Both month fields default to the current month; each field is labelled above it (US-13's skeleton) and the Import button is the form's primary action, visibly distinguished from the secondary controls. The progress readout is visible during the run, is **determinate** (n/N, counted in months, N = 2 for this range), advances to N/N, and is gone once the Import completes.
- Step 4: the import landed on `DudulSmash` and nowhere else — `Nonomoho` still reads `0 parties · 0 analysées` on `/profiles` (ADR-0014). On a clean run the consolidated summary reports **82** games fetched, **82** imported, **0** already present, a breakdown of **Blitz 72 / Bullet 10**, and a tally of **45 W · 0 D · 37 L** (parts summing to 82).
- Step 5: exactly two lines, in range order — **`2026-05` at 28 imported** and **`2026-06` at 54 imported**, summing to the consolidated 82. Neither is marked in échec.
- Step 6: the number of listed Games matches the imported count from the summary (82 on a clean run). Each entry reads as a row of parts — the selection checkbox, the description, the analysed state — with every badge landing on the same left edge across rows so the column can be scanned. **That alignment is the assertion**; the markup carrying it is not. It used to read "still a **list**, not a table", which shipped product then contradicted: `Mes parties` became a real `<table>` (US-19, PRs #59 and #60), and the 2026-08-24 run reported the wording as drift while verifying the intent — no overflow, and the last cell's box on one single left edge across all 82 rows. Corrected here rather than re-discovered every run. Its header is `Date / Adversaire / Résultat / Cadence / État / Lecture` plus the selection column — **`Lecture` since US-16a**, which is the state a `Personal analysis` puts on each Game (`Aucune lecture` / `Lecture en cours` / `Lecture scellée`, in words). The column count is **not** the assertion and is named here only so the next reader is not misled by a stale list; what is asserted is the alignment and the absence of overflow, which is what survives a column being added.
- Step 7: selecting a Game navigates to its Analyse page (`/analyse/:gameId`) and shows a board; the move indicator changes from the start position as you navigate, and castling/en passant/promotion resolve to the correct Position. The header names **both** players with their colour, marks the Player (in words, not by colour alone), and shows the result **stated from the Player's side** (Victoire / Défaite / Nulle — never `1-0`), the date, the cadence and the `Opening` as ECO + name. The header does not change while stepping through the Moves. On a White-side Game the board is White-at-bottom. The screen sits on a column wider than the app's reading column and the board is bounded, rather than sitting in the page's top-left corner (US-13). The pane beside the board holds the move list — a move list is not an annotation, and it is there for every Game — but on this unanalysed Game it holds **nothing of the engine** and offers no `Niveau de revue` control: there is nothing to reveal. The row proper is asserted at step 10.
- Step 7b: on a Black-side Game the board is **Black-at-bottom** — the Player's own back rank is nearest them — and the Player mark has moved to the Black line of the header. The pieces have not moved: the board is turned, not rearranged.
- Step 8: the replay's summary shows **0 imported / 82 already present**, both month lines saying so (28 and 54 already present); the listed Game count is unchanged.
- Step 9: after reload, the `Review mode` is still Unaided — never chosen, never volunteered — and `DudulSmash` is still the current Profile — the banner names it with no re-selection, and the scoped screens render its history rather than sending the Player to `/profiles`. The selection is what survives a restart now; there is no remembered username field left to pre-fill.
- Step 9b: the reading route (`/analyse/:gameId/lecture`) renders **no engine information at all** —
  no `Evaluation`, no advantage bar, no `Evaluation curve`, no severity glyph, no `Best line`, no
  `Niveau de revue` control — on a Game that has not been analysed, and it neither reads nor writes
  the remembered `Review mode` (still Unaided after the visit, per step 9). The board is oriented on
  the side the Player played. A `Declared severity`, a `Note` and a `Key moment` are each accepted and
  each **flagged in the move list**, the three told apart by their own accessible names **and** by
  what is drawn — three marks the eye cannot separate would defeat the point of putting them there.
  « Où j'en suis » states the coverage as **a count beside its share**. **No score, no justesse and no
  comparison appear anywhere** — that is US-16b, and its absence here is the assertion. Sealing is
  confirmed by a dialog that **names what it commits** (what is written is frozen; a sealed reading
  cannot be unsealed) with **Cancel as the primary action**; after it, the reading states the instant
  of sealing and is labelled **« Lue à l'aveugle »**, a mark written afterwards is accepted and shown
  as **posterior**, what was sealed remains readable unchanged beside it, and **no control anywhere
  unseals**. The Game's row in "Mes parties" moves from `Aucune lecture` to `Lecture scellée`, **in
  words**. Nowhere does the app claim to have **prevented** the Player from seeing the engine: it
  labels a reading, it does not certify one.
- Step 10: after the analysis pass completes, each selected Game shows the "analysée" badge — a
  bordered pill carrying **both** a checkmark and the word, so the tint is never the only signal;
  `/danger` renders a grid of cards (not the empty-state invitation) with at least one recurring
  `Danger position` on it, and the initial Position is **not** among them. Each
  entry states its **side to move** in text and its diagram is presented from that side. No wording
  on that page attributes a side to the Player: a `Danger position` merges reaches from Games played
  as White and as Black, so "your side" is undefined there (CONTEXT.md → `Board orientation`).
- Step 11: on each of the nine screens, in **both** themes — every colour resolves, text contrast
  holds at 4.5:1 (3:1 for large text) against the ground actually painted behind it, nothing scrolls
  sideways, every meaning-bearing tint still carries its non-chromatic cue, and `--white-share`,
  `--black-share` and the board's square tokens are **identical** between the two themes. The
  complete rule list, the audit tooling and the known-open exceptions are in
  [`theme-pass.md`](./theme-pass.md). The Game list, `/danger`, `/analyse` and the Profile's page are
  all populated at this point, so the pass sees real tinted rows, real cards, a real `Evaluation
  curve` and real counters — the ⚠
  markers and the severity glyphs `?!` `?` `??` must be present and readable at night too. Nothing
  is imported and nothing is analysed by this step; a contrast failure outside the known-open list is
  **blocking**.

### Backing store (optional)
- The embedded SQLite database holds one row per imported Game with its chess.com URL, the Player's side, the Player-relative result and **the `Profile` it belongs to**; the same URL never appears twice **for that Profile** (dedup is per Profile since US-11 — two followed Profiles that played each other each hold their own copy, ADR-0014). The current-Profile selection is **not** in the database: it lives client-side (ADR-0014).

## Cleanup (best-effort)
- The run imports real Games into its own database file. To re-run from a clean state, restore
  path 0's **empty-history snapshot** over it again, with the server stopped — that is this
  scenario's clean state, Profile included.

## Notes
- **Real network dependency**: needs chess.com reachable. Since US-9 an outage or rate-limit no
  longer aborts the Import: the affected month is marked on its own line — **échec** when it
  received nothing, **incomplet** followed by what it did bring in when Games arrived before it
  stopped — and the
  remaining months are still covered. That is a legitimate finding about the environment, not the
  app — and the run is still readable, since the other months' lines stand. Replaying the range
  catches the failed month up. A `Profile` whose username the relay cannot resolve at all still
  fails the request outright, before any month is fetched — though since US-11 the username was
  already validated when the Profile was created, so that case is now unreachable from the UI.
- Use an **immutable past month** as the anchor (2026-06) so counts are stable; the current
  month keeps changing as the Player plays.
- **Watch the progress readout from before the click** — for the Import *and* for the analysis pass.
  On the 2026-08-17 run the real two-month import completed in **under two seconds**, so a driver
  that starts polling *after* submitting sees the summary and never the readout — and step 3 asserts
  the readout. Install the observer first. The **analysis pass is now just as fast**: 29 Positions on
  the native engine backend finished before an observer installed at click time recorded a single
  intermediate value on the 2026-08-19 run — only the final `29` was captured, so the "count
  advances, it does not sit at zero" half of step 10 went **unobserved rather than green**. Install
  that observer before the click too, and if a run still only sees the final figure, record it as
  *not exercised* rather than as a pass.
  There is no analysis status endpoint to poll (`/api/import/status` exists, its analysis counterpart
  does not): watch the DOM readout, which is what is under test anyway.
- The Import is one fetch **per month**, run sequentially — expect the progress readout to sit on
  each month in turn rather than to advance smoothly.
- The figures in the Preconditions table were read from the live chess.com API on 2026-08-12 and
  both months are in the past, so they should stay put. If they drift, **re-check the account and
  update the table** rather than loosening the checks — the point of anchoring on immutable months
  is to keep this scenario assertable on real data.
- The range covers 2 months, so the Import is 2 sequential fetches. The 54-game month dominates the
  run; expect the readout to sit on `1/2` for most of it.
