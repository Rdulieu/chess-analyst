# chess-analyst

Solo tool to import a player's chess.com history and find where to improve. See `CONTEXT.md`
for the domain language and `docs/adr/` for the architecture decisions.

## Stack

- **client/** — React + Vite, board via `react-chessboard`, game logic/PGN via `cm-chess` (ADR-0004)
- **server/** — local Node/Express API over embedded SQLite through Drizzle (ADR-0002, ADR-0003)

Everything runs on the player's own machine, launched on demand — no cloud (ADR-0002).

## Run

```bash
npm install
npm run dev
```

`npm run dev` starts the local server (`http://localhost:3001`) and the Vite frontend
(`http://localhost:5173`) together. On first launch the SQLite schema is created (via the
Drizzle migrations in `server/src/db/migrations/`) and a fixture Game (Morphy's Opera Game,
1858) is seeded, so the board has something real to show before chess.com import (US-2) exists.
Open the frontend and the fixture's starting position appears on the board.

The database is a single local file (`server/chess-analyst.db`, git-ignored). It's disposable:
delete it (`rm server/chess-analyst.db*`) to reset — the next launch re-migrates and re-seeds.

## Checks

```bash
npm test     # Vitest — server (repository/seed/API) + client (board/PGN)
npm run lint # ESLint
npm run build # TypeScript typecheck (both) + client production build
```

## Scope so far (US-1, issue 01)

DB → API → board showing the fixture Game's starting position. Move navigation (forward/backward,
jump-to-move) is the next slice. No chess.com import and no Stockfish/analysis yet — those are
US-2/US-3/US-4.
