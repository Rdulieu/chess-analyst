## Status
ready-for-agent

## Parent

`.scratch/app-skeleton/PRD.md`

## What to build

Set up the whole application skeleton: a React frontend and a local Node server that start
together via a single local command (ADR-0002), with a SQLite database wired through Drizzle
(ADR-0003). The database schema models `Game` per the domain glossary (id, PGN, opponent,
result, date, time control category — see `CONTEXT.md`), auto-migrating on first launch. A seed
step inserts one fixture Game (a real, short, recognizable PGN) if the table is empty. The local
server exposes `GET /api/games` (list) and `GET /api/games/:id` (detail). The frontend fetches
the fixture Game from the server and renders its starting position on an interactive chessboard
using `react-chessboard`, with `cm-chess` parsing the PGN (ADR-0004). No navigation yet — this
slice only proves the pipe works end to end.

## Acceptance criteria

- [ ] A single local command starts both the frontend and the local server together
- [ ] The SQLite schema (Drizzle) is created automatically on first launch if it doesn't exist
- [ ] A fixture Game is seeded into the database if none exists, with pgn, opponent, result, date, and time control category populated
- [ ] `GET /api/games` returns the fixture Game
- [ ] `GET /api/games/:id` returns the fixture Game's full detail
- [ ] The frontend renders the fixture Game's starting position on an interactive chessboard
- [ ] No network call to chess.com exists anywhere in the code
- [ ] No Stockfish, Evaluation, or Mistake code exists yet
- [ ] No Weak opening or Danger position computation exists yet

### Feature Path (FP)

1. Launch the app with its single command → the frontend becomes reachable and shows a chessboard.
2. Look at the board → the fixture Game's starting position is displayed, matching that game's actual first position.

Verify: UI first — open the running frontend and read the board. Only probe the API/DB directly if the UI can't establish that the fixture Game is correctly the one seeded.

## Blocked by

None - can start immediately
