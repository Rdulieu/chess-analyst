# Frontend is React; the board is react-chessboard; game logic/PGN is cm-chess

The frontend framework choice, deferred earlier, is settled as **React**. The interactive board
uses **react-chessboard** (rendering/input), and move validation, FEN, and PGN import/export use
**cm-chess** rather than the far more popular chess.js.

## Considered options

- **Board rendering**: `chessground` (lichess's own board, proven at scale, but flagged "no longer supported" on npm) and `vue3-chessboard` (would have paired with a Vue frontend, but stale for ~2 years and itself wraps the unsupported chessground) were rejected once React was chosen. `react-chessboard` is the actively maintained (Feb 2026, v5.10.0), React-native option with a clean props API — no manual DOM-wrapping needed, unlike fitting `cm-chessboard` into React.
- **Game logic/PGN**: `chess.js` is the de facto standard (200+ npm dependents) but keeps a **linear** move history and slower release pace (~1 year since last version). `cm-chess` wraps `chess.mjs` (an ES6 fork of the same chess.js engine, same author as cm-chessboard) plus `cm-pgn`, giving equivalent rule validation but with a **tree-structured history** (variations/branches) and native PGN annotations (NAGs, comments) and Chess960 support. Chosen because branching analysis lines are of real interest for this project, despite a much smaller community (28 stars vs. chess.js's wide adoption) and no explicit TypeScript typings.

## Consequences

`cm-chess`'s smaller community means less prior art to lean on if an exotic rules edge case misbehaves — worth a closer look if that happens, since its rule engine (`chess.mjs`) is a fork rather than chess.js itself. The 50-move-rule detection isn't explicitly documented; not a blocker today since chess.com's own game result is trusted rather than recomputed, but worth verifying if the app ever needs to detect that rule itself.
