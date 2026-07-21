# App skeleton — interactive board on a fixture Game

Status: ready-for-agent
Business ref: BACKLOG.md — US-1

## Problem Statement

Nothing has been built yet. The real value of this project — importing chess.com history,
surfacing Weak openings and Danger positions — depends on a stack (React frontend, local Node
server, SQLite persistence, the interactive board toolkit) that has never been proven to fit
together. Building chess.com import or analysis first risks discovering integration problems
once real data and real complexity are already layered on top.

## Solution

A minimal, end-to-end skeleton of the app: a React frontend and a local Node server, started
together with a single local command (no cloud, no always-on process — ADR-0002), backed by a
SQLite database via Drizzle (ADR-0003). No chess.com import and no analysis exist yet — instead,
one fixture Game is seeded directly into the database so there's something real to display. The
frontend renders that Game on an interactive chessboard (react-chessboard + cm-chess — ADR-0004)
and lets the player step through its Moves. This proves the whole chain works before US-2
(chess.com import), US-3 (Weak opening statistics), and US-4 (Stockfish-based Danger position
analysis) build real functionality on top of it.

## User Stories

1. As a player, I want to start the whole app with a single local command, so that using my tool doesn't mean juggling multiple processes.
2. As a player, I want the frontend and local server to launch together, so that "starting the app" is one simple action.
3. As a player, I want the database schema to be created automatically the first time I launch the app, so that I don't need any manual setup step.
4. As a player, I want a fixture Game already available when I first launch the app, so that I have something real to look at before chess.com import exists.
5. As a player, I want to see the fixture Game rendered on an interactive chessboard, so that I can see the actual position of the pieces.
6. As a player, I want to step forward through the Game one Move at a time, so that I can watch the position evolve.
7. As a player, I want to step backward through the Game one Move at a time, so that I can revisit an earlier position.
8. As a player, I want to jump directly to any Move in the Game, so that I don't have to click through every intermediate Move to reach the one I care about.
9. As a player, I want to see the Move notation (e.g. e4, Nf3) alongside the board as I navigate, so that I can follow the Game in standard chess notation, not just visually.
10. As a player, I want castling, en passant, and promotion to be reflected correctly as I navigate, so that the position shown is always accurate.
11. As a player, I want the Game data to carry its time control category (bullet/blitz/rapid/daily), opponent, result, and date even though only a fixture value is populated for now, so that US-2's real import doesn't require a schema change.
12. As a player, I want the local server to expose the fixture Game through an API rather than the frontend hardcoding it, so that US-2 can add real Games without the frontend's data-fetching code changing.
13. As a player, I want this first version to make no chess.com network calls at all, so that the interactive board and the underlying plumbing can be validated in complete isolation from import concerns.
14. As a developer picking up US-2/US-3/US-4 later, I want the project's basic tooling (TypeScript, linting, test runner) already in place, so that I can start writing code and tests immediately without re-deciding foundational setup.

## Implementation Decisions

- **`react-chessboard` + `cm-chess`** render the board and drive move history/navigation (ADR-0004). `cm-chess` parses the fixture Game's PGN into its tree-structured move history; the frontend walks that history to implement forward/backward/jump-to-move navigation.
- **Local Node server** (ADR-0002) exposes:
  - `GET /api/games` — list of Games (will return exactly one: the fixture)
  - `GET /api/games/:id` — a single Game's full detail (PGN, opponent, result, date, time control)
  - No chess.com calls anywhere in this server yet — that relay is US-2's job.
- **SQLite via Drizzle** (ADR-0003): a `games` table matching the `Game` glossary term — id, pgn, opponent, result, date, time control category. Schema/migrations run automatically on first launch. A seed step inserts one fixture Game (a short, recognizable real PGN) if the table is empty.
- **Single launch command**: one script starts both the frontend and the local server together, per ADR-0002.
- Explicitly **not built** in this US: chess.com import/relay logic, Stockfish integration, any Weak opening or Danger position computation. The schema only carries the fields needed to display a Game — no `Evaluation`/`Mistake` storage yet (that arrives with US-4).

## Testing Decisions

Tests should assert observable behavior (what's stored, what the API returns, what's rendered/navigable) — not internals of Drizzle, react-chessboard, or cm-chess.

- **Data layer**: repository functions (e.g. `listGames()`, `getGame(id)`) tested against a real (temp-file or in-memory) SQLite database — insert the fixture, read it back, assert the shape matches the `Game` glossary fields (including time control category).
- **API**: `GET /api/games` and `GET /api/games/:id` tested against a running server instance + a test database, asserting the fixture Game round-trips correctly. This is the highest practical seam below the full UI.
- **Board component**: mount the interactive board with the fixture Game's PGN parsed via `cm-chess`; simulate forward/backward/jump-to-move navigation; assert the position shown at each step matches `cm-chess`'s computed position for that Move.
- **Feature Path (agentic, apex)**: a subagent launches the app via its single local command, opens the frontend in a real browser, confirms the fixture Game is visible, and navigates through several Moves on the board — confirming the displayed position updates correctly each time. This is the auto-merge gate for this US's issues (see `agentic-tests`).
- No Happy Path suite yet — this US is infrastructural. HP candidates should be considered once US-2/US-3/US-4 add real, end-to-end player value on top of this skeleton.

## Out of Scope

- Chess.com API import and the local relay server (US-2)
- Any Stockfish integration, `Evaluation`, or `Mistake` (US-4)
- `Weak opening` statistics computation (US-3)
- `Danger position` computation (US-4)
- Browsing or listing multiple Games beyond the single fixture (arrives naturally with US-2)
- Any hosting/deployment beyond a single local machine launch (already ruled out generally by ADR-0002)

## Further Notes

The fixture Game should be a real, short, recognizable PGN so both manual review and the
agentic Feature Path can verify it at a glance. This US's value is entirely in de-risking the
architecture (ADR-0001 through ADR-0004) before US-2, US-3, and US-4 build real player-facing
value on top of it.
