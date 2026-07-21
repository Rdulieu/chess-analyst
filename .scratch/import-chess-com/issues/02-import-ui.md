# 02 — Import UI and browsing imported Games

Status: ready-for-agent
Business ref: BACKLOG.md — US-2

**Integration branch.** Implemented on `integration/US-2-import-chess-com`: branch a `feature/*`
from it and merge back **into it** (auto-merge on a green local check), NOT into `develop`.

## Parent

`.scratch/import-chess-com/PRD.md` (US-2).

## What to build

The Player-facing import flow on top of issue 01's backend. The app opens empty and invites the
Player to import. A form lets them enter their chess.com username, pick a month/year, and select
the time control categories to import, then trigger it. The imported Games then appear in the app
and can be opened and navigated on the existing US-1 board.

- **Empty state**: when no Games exist, the app shows an invitation to import (US-1's App currently
  shows "No game available yet").
- **Import form**: username field, month/year selector, time-control category multi-select, Import
  button; on submit it calls the relay's import and refreshes the Game list.
- **Game list + board**: imported Games are listed and selectable; opening one reuses the US-1
  board and Move navigation. (US-1's App renders a single Game; it grows to list the imported ones.)
- `client/src/api.ts` gains `importGames(params)` alongside the existing `fetchGames`/`fetchGame`.

Progress bar (issue 04) and the rich summary window (issue 03) are out of scope here — a simple
"importing…" / "done" state is enough; this slice is about seeing the imported Games.

## Acceptance criteria

- [ ] With an empty database, the app shows an invitation to import rather than an error.
- [ ] The form lets the Player enter a username, pick a month/year, and select one or more time control categories.
- [ ] Triggering the import calls the relay and, on success, the imported Games appear in the app.
- [ ] Selecting an imported Game opens it on the US-1 board with working Move navigation.
- [ ] An import error (e.g. unknown username) is surfaced to the Player without crashing the app.

### Feature Path (FP)

UI-first, against the running app with the chess.com base URL pointed at a canned archive.

1. Open the app with no Games yet → the Player is invited to import.
2. Enter a username, pick a month and one or more categories, start the import → the month's Games appear in the app.
3. Open one imported Game → its Moves show and are navigable on the board.

Verify: UI first (the invitation, the form, the resulting Game list, the board).

## Blocked by

- Issue 01 (import backend).
