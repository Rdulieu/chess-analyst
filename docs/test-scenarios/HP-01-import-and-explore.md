---
id: HP-01
covers: [Profile, Import, Monthly import, Game, Move, Position, Evaluation, Evaluation curve, Danger position, Board orientation, Theme]
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
- The stylesheet and the dark theme (US-13): the final step walks all eight screens in both themes.
  This scenario is the one whose state reaches every screen with content, so it is the strongest of
  the three theme passes.

## Preconditions
- App started locally with its single command, on this scenario's own port and its own database
  file, talking to the **real** chess.com API (no `CHESSCOM_BASE_URL` override).
- **Clean data state, restored**: [path 0](./path-0-bootstrap.md)'s **empty-history snapshot**
  copied into this scenario's database file, with the server stopped. It holds the reference
  `Profile` and **no Games**, so the empty-state invitation shows and the import counts are
  predictable. The Profile's creation and its chess.com validation belong to path 0; this scenario
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
7. Open one imported Game the Player played **as White** (selecting it in the list navigates to its Analyse page, `/analyse/:gameId`) → a header names both players with their colour and marks which one is the Player, alongside the result, date, cadence and `Opening`; its Position renders on the board, White at the bottom; stepping forward/backward and jumping to a Move updates the Position accordingly.
7b. Go back and open a Game the Player played **as Black** → the same header, now marking the Player on the Black side, and the board is read **Black at the bottom**.
8. Start the same Import again from the Profile's page (same range + categories) → the summary reports the Games as already present, and the Game list gains no duplicate.
9. Reopen the app (reload) → `DudulSmash` is **still the current Profile**: the banner names it without re-selecting, and the scoped screens show its history straight away.
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
   > reference dataset (2026-08-14): of the 6 first-Move groups holding at least two Games, **none**
   > fails to share a Position; the cheapest pair is a 6-ply and a 21-ply Game, both answering 1.e4.
   >
   Then reopen **whichever of the two Games carries at least one flawed Move of the Player's** (the
   move list and the error tally say which; if neither does, record the curve's error marking as *not
   exercised* rather than red — the step selects the two shortest Games, and a short Game often holds
   no mistake at all) → beside its board, in the annotations pane, an `Evaluation curve`
   runs from the starting Position on the left to the last Move on the right; stepping through
   the Moves moves a mark along it, and the Player's own flawed Moves are marked on it by the
   same glyph the move list uses, with a count of them in words.

   > **Why here and not as a scenario of its own**: the curve needs a Game with real
   > `Evaluation`s, which this step has just produced — it costs one navigation and no engine
   > time. (US-14, grafted; the HP budget stays at 3.)

   > Do not substitute "the two shortest Games **overall**": it is the same pair here, but only
   > because both happen to answer 1.e4 — it would go green for the wrong reason elsewhere.
11. **Theme pass (US-13)** — walk the navigation across **all eight screens** (Mes parties,
    Explorateur, Ouvertures, Positions dangereuses, Stats, Analyse by opening a Game, Profils, and
    the Profile's own page), first in the light theme, then again with the system's **dark preference
    emulated** → every screen is painted in the theme the system asks for, and everything the Player
    must be able to read stays readable in both. **No further Import and no further analysis**: the
    pass reuses exactly the state steps 1–10 built, which is why it is the last step and not a
    scenario of its own.

    > The rules asserted here, the eight screens, the audit tooling and the known-open findings are
    > written once in [`theme-pass.md`](./theme-pass.md) — the same step closes HP-02 and HP-03, and
    > three copies of an assertion list would drift. This scenario's state is the richest of the
    > three (real Games, two analysed, `/danger` populated, and a Profile page carrying real
    > counters), so this is where the pass sees the most.

## Checks
### UI
- Step 1: `/profiles` lists `DudulSmash` with **0** Games imported and **0** analyzed; selecting it marks the row "Profil actuel" in words, and every scoped screen afterwards carries the banner naming `DudulSmash`.
- Step 2: "Mes parties" carries its own heading, shows an invitation to import and **no import form** — the form is not on this screen since US-11, and the invitation leads to the Profile's page. With the restored empty history no Games are listed.
- Step 3: the Profile's page (`/profiles/:id`) names the Profile and carries the import form: a first and a last month, category checkboxes and an Import button, and **no username field** at all. Both month fields default to the current month; each field is labelled above it (US-13's skeleton) and the Import button is the form's primary action, visibly distinguished from the secondary controls. The progress readout is visible during the run, is **determinate** (n/N, counted in months, N = 2 for this range), advances to N/N, and is gone once the Import completes.
- Step 4: on a clean run the consolidated summary reports **82** games fetched, **82** imported, **0** already present, a breakdown of **Blitz 72 / Bullet 10**, and a tally of **45 W · 0 D · 37 L** (parts summing to 82).
- Step 5: exactly two lines, in range order — **`2026-05` at 28 imported** and **`2026-06` at 54 imported**, summing to the consolidated 82. Neither is marked in échec.
- Step 6: the number of listed Games matches the imported count from the summary (82 on a clean run). It is still a **list**, not a table, and each entry reads as a row of three parts — the selection checkbox, the description, the analysed state — with every badge landing on the same left edge across rows so the column can be scanned.
- Step 7: selecting a Game navigates to its Analyse page (`/analyse/:gameId`) and shows a board; the move indicator changes from the start position as you navigate, and castling/en passant/promotion resolve to the correct Position. The header names **both** players with their colour, marks the Player (in words, not by colour alone), and shows the result **stated from the Player's side** (Victoire / Défaite / Nulle — never `1-0`), the date, the cadence and the `Opening` as ECO + name. The header does not change while stepping through the Moves. On a White-side Game the board is White-at-bottom. The screen sits on a column wider than the app's reading column and the board is bounded, rather than sitting in the page's top-left corner (US-13). The **second pane beside the board is the annotations pane, and it only exists once the Game is analysed** — on the unanalysed Game this step opens, the board row holds the board alone and the move list runs below it. The row proper is asserted at step 10.
- Step 7b: on a Black-side Game the board is **Black-at-bottom** — the Player's own back rank is nearest them — and the Player mark has moved to the Black line of the header. The pieces have not moved: the board is turned, not rearranged.
- Step 8: the replay's summary shows **0 imported / 82 already present**, both month lines saying so (28 and 54 already present); the listed Game count is unchanged.
- Step 9: after reload, `DudulSmash` is still the current Profile — the banner names it with no re-selection, and the scoped screens render its history rather than sending the Player to `/profiles`. The selection is what survives a restart now; there is no remembered username field left to pre-fill.
- Step 10: after the analysis pass completes, each selected Game shows the "analysée" badge — a
  bordered pill carrying **both** a checkmark and the word, so the tint is never the only signal;
  `/danger` renders a grid of cards (not the empty-state invitation) with at least one recurring
  `Danger position` on it, and the initial Position is **not** among them. Each
  entry states its **side to move** in text and its diagram is presented from that side. No wording
  on that page attributes a side to the Player: a `Danger position` merges reaches from Games played
  as White and as Black, so "your side" is undefined there (CONTEXT.md → `Board orientation`).
- Step 11: on each of the eight screens, in **both** themes — every colour resolves, text contrast
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
  longer aborts the Import: the affected month is marked in **échec** on its own line and the
  remaining months are still covered. That is a legitimate finding about the environment, not the
  app — and the run is still readable, since the other months' lines stand. Replaying the range
  catches the failed month up. A `Profile` whose username the relay cannot resolve at all still
  fails the request outright, before any month is fetched — though since US-11 the username was
  already validated when the Profile was created, so that case is now unreachable from the UI.
- Use an **immutable past month** as the anchor (2026-06) so counts are stable; the current
  month keeps changing as the Player plays.
- **Watch the progress readout from before the click.** On the 2026-08-17 run the real two-month
  import completed in **under two seconds**, so a driver that starts polling *after* submitting sees
  the summary and never the readout — and step 3 asserts the readout. Install the observer first.
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
