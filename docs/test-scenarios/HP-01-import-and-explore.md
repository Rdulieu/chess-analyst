---
id: HP-01
covers: [Import, Monthly import, Game, Move, Position, Evaluation, Danger position, Board orientation]
---

# HP-01 — Import and explore my chess.com history

## Goal
The Player imports a **range of months** of their real chess.com history through the local
relay, follows its progress month by month, reads a summary of what was retained — overall
and per month — and can open an imported Game and step through its Moves on the board. This
is US-2's core value (replacing the fixture with the Player's real Games), widened by US-9
from a single month to a range.

> Run against the **real chess.com API** (not a fixture archive). This is the slow,
> network-dependent, run-once validation — the definitive check that the true
> chess.com contract works end to end.

## Drive-by
- Player settings: the chess.com username is remembered across sessions.
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

## Preconditions
- App started locally with its single command, talking to the **real** chess.com
  API (no `CHESSCOM_BASE_URL` override).
- **Clean data state**: a fresh local database (no Games, no stored username) so the
  empty-state invitation shows and counts are predictable. Reset the local database
  file if needed before running.
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
1. Open the app with an empty history → the Player is invited to import; the import form is shown.
2. Enter the chess.com username (`DudulSmash`), set the range (from 2026-05 to 2026-06) and at least the Blitz and Bullet categories, and start the Import → a progress readout counted in months runs, then a summary appears.
3. Read the consolidated summary → it reports the total games fetched over the range, a per-category breakdown, how many were newly imported vs already present, and a win/draw/loss tally.
4. Read the per-month lines → one line per month of the range, in order, each saying what that month brought in.
5. See the imported Games listed in the app.
6. Open one imported Game the Player played **as White** (selecting it in the list navigates to its Analyse page, `/analyse/:gameId`) → a header names both players with their colour and marks which one is the Player, alongside the result, date, cadence and `Opening`; its Position renders on the board, White at the bottom; stepping forward/backward and jumping to a Move updates the Position accordingly.
6b. Go back and open a Game the Player played **as Black** → the same header, now marking the Player on the Black side, and the board is read **Black at the bottom**.
7. Start the same Import again (same range + categories) → the summary reports the Games as already present, and the Game list gains no duplicate.
8. Reopen the app (reload) → the username is already prefilled from the remembered setting.
9. (Drive-by, US-4 + US-8 + US-10b) Select the **two shortest Games sharing the same first Move**
   and start the analysis pass on them (real WASM
   Stockfish, depth 16 — allow it real time to finish) → while it runs, a count of **Positions
   evaluated** advances (it does not sit at zero); when it ends, an explicit confirmation states
   how many Games and Positions were covered, and both Games are marked "analysée". Dismiss the
   confirmation → it disappears, and does not come back after a reload. Open "Positions
   dangereuses" (`/danger`) → while it computes, a **text readout announces the computation**
   (never a blank page); it then renders **at least one** `Danger position`, **reached at least
   twice**, and the **initial Position is not among them**. Shape only otherwise (real games, no
   fixed figures expected), each diagram stating its **side to move** and presented from that side.

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
   > Do not substitute "the two shortest Games **overall**": it is the same pair here, but only
   > because both happen to answer 1.e4 — it would go green for the wrong reason elsewhere.

## Checks
### UI
- Step 1: an invitation to import and the form (username, a first and a last month, category checkboxes, Import button) are visible; with a clean state no Games are listed. Both month fields default to the current month.
- Step 2: the progress readout is visible during the run, is **determinate** (n/N, counted in months, N = 2 for this range), advances to N/N, and is gone once the Import completes.
- Step 3: on a clean run the consolidated summary reports **82** games fetched, **82** imported, **0** already present, a breakdown of **Blitz 72 / Bullet 10**, and a tally of **45 W · 0 D · 37 L** (parts summing to 82).
- Step 4: exactly two lines, in range order — **`2026-05` at 28 imported** and **`2026-06` at 54 imported**, summing to the consolidated 82. Neither is marked in échec.
- Step 5: the number of listed Games matches the imported count from the summary (82 on a clean run).
- Step 6: selecting a Game navigates to its Analyse page (`/analyse/:gameId`) and shows a board; the move indicator changes from the start position as you navigate, and castling/en passant/promotion resolve to the correct Position. The header names **both** players with their colour, marks the Player (in words, not by colour alone), and shows the result **stated from the Player's side** (Victoire / Défaite / Nulle — never `1-0`), the date, the cadence and the `Opening` as ECO + name. The header does not change while stepping through the Moves. On a White-side Game the board is White-at-bottom.
- Step 6b: on a Black-side Game the board is **Black-at-bottom** — the Player's own back rank is nearest them — and the Player mark has moved to the Black line of the header. The pieces have not moved: the board is turned, not rearranged.
- Step 7: the replay's summary shows **0 imported / 82 already present**, both month lines saying so (28 and 54 already present); the listed Game count is unchanged.
- Step 8: after reload, the username field is pre-filled with `DudulSmash`.
- Step 9: after the analysis pass completes, the selected Game shows the "analysée" badge; `/danger`
  renders a list (not the empty-state invitation) with at least the starting Position present. Each
  entry states its **side to move** in text and its diagram is presented from that side. No wording
  on that page attributes a side to the Player: a `Danger position` merges reaches from Games played
  as White and as Black, so "your side" is undefined there (CONTEXT.md → `Board orientation`).

### Backing store (optional)
- The embedded SQLite database holds one row per imported Game with its chess.com URL, the Player's side, and the Player-relative result; the same URL never appears twice (dedup). The `settings` table holds the username.

## Cleanup (best-effort)
- The run imports real Games into the local database. To re-run from a clean state,
  reset the local database file (it is recreated empty on next launch).

## Notes
- **Real network dependency**: needs chess.com reachable. Since US-9 an outage or rate-limit no
  longer aborts the Import: the affected month is marked in **échec** on its own line and the
  remaining months are still covered. That is a legitimate finding about the environment, not the
  app — and the run is still readable, since the other months' lines stand. Replaying the range
  catches the failed month up. A username the relay cannot resolve at all still fails the request
  outright, before any month is fetched.
- Use an **immutable past month** as the anchor (2026-06) so counts are stable; the current
  month keeps changing as the Player plays.
- The Import is one fetch **per month**, run sequentially — expect the progress readout to sit on
  each month in turn rather than to advance smoothly.
- The figures in the Preconditions table were read from the live chess.com API on 2026-08-12 and
  both months are in the past, so they should stay put. If they drift, **re-check the account and
  update the table** rather than loosening the checks — the point of anchoring on immutable months
  is to keep this scenario assertable on real data.
- The range covers 2 months, so the Import is 2 sequential fetches. The 54-game month dominates the
  run; expect the readout to sit on `1/2` for most of it.
