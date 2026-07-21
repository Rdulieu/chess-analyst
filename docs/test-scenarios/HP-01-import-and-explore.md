---
id: HP-01
covers: [Import, Game, Move, Position]
---

# HP-01 — Import and explore my chess.com history

## Goal
The Player imports a month of their real chess.com history through the local relay,
sees a summary of what was retained, and can open an imported Game and step through
its Moves on the board. This is US-2's core value: replacing the fixture with the
Player's real Games.

> Run against the **real chess.com API** (not a fixture archive). This is the slow,
> network-dependent, run-once validation — the definitive check that the true
> chess.com contract works end to end.

## Drive-by
- Player settings: the chess.com username is remembered across sessions.
- Import summary: per-category breakdown and the Player's win/draw/loss tally.
- Progress indicator while the import is in flight.
- Board navigation (Previous / Next / jump-to-Move) on an imported Game.
- Incremental Import: re-importing the same month adds no duplicate.

## Preconditions
- App started locally with its single command, talking to the **real** chess.com
  API (no `CHESSCOM_BASE_URL` override).
- **Clean data state**: a fresh local database (no Games, no stored username) so the
  empty-state invitation shows and counts are predictable. Reset the local database
  file if needed before running.
- A real chess.com account with games in the chosen month. Reference account for
  this suite: the Player's username **`DudulSmash`**, month **2026/06** (an immutable
  past month with 54 games: 48 blitz + 6 bullet, all standard chess).

## Journey
1. Open the app with an empty history → the Player is invited to import; the import form is shown.
2. Enter the chess.com username (`DudulSmash`), choose the month (2026-06) and at least the Blitz and Bullet categories, and start the Import → a progress indicator runs, then a summary appears.
3. Read the summary → it reports the total games fetched, a per-category breakdown, how many were newly imported vs already present, and a win/draw/loss tally.
4. See the imported Games listed in the app.
5. Open one imported Game → its Position renders on the board; stepping forward/backward and jumping to a Move updates the Position accordingly.
6. Start the same Import again (same month + categories) → the summary reports the Games as already present, and the Game list gains no duplicate.
7. Reopen the app (reload) → the username is already prefilled from the remembered setting.

## Checks
### UI
- Step 1: an invitation to import and the form (username, month, category checkboxes, Import button) are visible; with a clean state no Games are listed.
- Step 2: a progress indicator is visible during the run and gone once it completes.
- Step 3: the summary shows a non-zero total, a breakdown naming the categories actually present (Blitz and Bullet for 2026/06), an "imported" count and an "already present" count, and a W · D · L tally whose parts sum to the in-scope game count.
- Step 4: the number of listed Games matches the imported count from the summary.
- Step 5: opening a Game shows a board; the move indicator changes from the start position as you navigate, and castling/en passant/promotion resolve to the correct Position.
- Step 6: the second import's summary shows 0 imported / all already present; the listed Game count is unchanged.
- Step 7: after reload, the username field is pre-filled with `DudulSmash`.

### Backing store (optional)
- The embedded SQLite database holds one row per imported Game with its chess.com URL, the Player's side, and the Player-relative result; the same URL never appears twice (dedup). The `settings` table holds the username.

## Cleanup (best-effort)
- The run imports real Games into the local database. To re-run from a clean state,
  reset the local database file (it is recreated empty on next launch).

## Notes
- **Real network dependency**: needs chess.com reachable; a rate-limit or outage
  surfaces as an "Import from chess.com failed" message (502 from the relay), which
  is a legitimate finding about the environment, not the app.
- Use an **immutable past month** (e.g. 2026/06) so counts are stable; the current
  month keeps changing as the Player plays.
- A very active month can be large; the import is still one fetch — expect the
  progress indicator to sit through the fetch, then complete quickly.
- Win/draw/loss and per-category counts depend on the month's real games — assert
  their **shape and internal consistency** (parts sum to the total), not fixed numbers.
