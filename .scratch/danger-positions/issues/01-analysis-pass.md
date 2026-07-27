# Analysis pass — evaluate selected Games with the local engine and store per-ply Evaluations

Status: ready-for-agent

## Parent

`.scratch/danger-positions/PRD.md` (BACKLOG.md — US-4)

## Integration branch

Implemented on the business-story integration branch `integration/US-4-danger-positions` — **branch
from it and merge back into it, NOT `develop`**. Auto-merges into `integration/US-4-danger-positions`
after a green local check (build + tests + green FP, no blocking finding); the
`integration/US-4-danger-positions -> develop` merge stays a human decision. The branch already
carries the grilling output (`CONTEXT.md`, ADR-0008, ADR-0009, PRD).

## What to build

A **manual, incremental engine-analysis pass**, driven from the Game list. The Player selects Games
on "Mes parties" and starts an analysis; the **local Node server** evaluates **every Position** of
each selected Game with the chess engine (ADR-0008) and stores **one raw `Evaluation` per
half-move** (ADR-0009). It runs as a **background job** with **determinate progress**; already-
analyzed Games are skipped, so `Evaluation`s are computed **once and never recomputed**. Each Game
shows an **"analysée" badge**.

End-to-end, this slice cuts through every layer:

- **Engine behind an `Engine` interface (ADR-0008).** UCI-shaped `evaluate(fen, limit) → { cp | mate,
  bestmove }`, run in the server in a **`worker_thread`** so a minutes-long analysis never blocks the
  API. Backends: **WASM-in-Node = default** (npm-only, no native install); **native = opt-in** via
  `STOCKFISH_PATH` (same UCI driver); and a **fixture/fake backend selectable at runtime** (env, the
  way `CHESSCOM_BASE_URL` selects a fixture archive) so tests and the Feature Path are deterministic
  and **never invoke the real Stockfish** (an external dependency). Fixed search **depth 16**.
- **Analysis service (ADR-0009).** Walk a Game's Positions and, for each ply, call the `Engine` and
  store its `Evaluation`. Evaluating *every* Position is required (a Move's quality, computed later in
  slice 02, is the drop between its Position's eval and the next Position's eval — two consecutive
  plies). A per-Game **`analyzed` flag** (twin of `move_habits_computed`, ADR-0005) makes the pass
  **incremental and idempotent** — an already-analyzed Game is skipped and never double-stored.
- **Storage.** A new **`evaluations`** table, one row per analyzed ply `(game_id, ply index,
  cp | mate)`; an **`analyzed`** boolean column on `games`. Dev-phase rules: migration + re-analyze,
  no backfill machinery. **No** severity column and **no** danger table (both derived in slice 02).
- **Background job + progress.** `POST /api/analyze { gameIds }` starts the job over the not-yet-
  analyzed among the given Games and returns immediately (202); `GET /api/analyze/status` reports
  `{ running, total, done }` for a **determinate** progress readout. Only one job at a time.
- **UI on "Mes parties".** Game selection (checkboxes) + an "Analyser la sélection" action; a
  **progress indicator** while the job runs (polling the status); an **"analysée" badge** per Game
  (the `analyzed` flag, exposed on the `Game` returned by `GET /api/games`).

API contract (shape, not fixed values):

```
POST /api/analyze  { gameIds: number[] }  → 202, { running, total, done }   // job over the unanalyzed gameIds
GET  /api/analyze/status                   → { running: boolean, total, done }
GET  /api/games                            → Game[] now includes `analyzed: boolean`
```

## Acceptance criteria

- [x] The engine is reached only through an `Engine` interface; the real backend is a WASM Stockfish run in the Node server in a `worker_thread`, and a fixture/fake backend is selectable at runtime (so tests and the FP never invoke real Stockfish)
- [ ] An optional native backend is used when `STOCKFISH_PATH` is set (same UCI driver); WASM is the default otherwise — implemented and type-checked, but **not empirically verified**: no native Stockfish UCI binary is available on this machine's PATH, and per the task's own instruction none was to be installed. `createNativeEngine` shares `uci-driver.ts` with the WASM backend (only the transport differs), and `createEngine()` does route to it when `STOCKFISH_PATH` is set / to WASM otherwise — but no real process has actually been driven end-to-end.
- [ ] The analysis service evaluates every Position of a Game and stores one `Evaluation` (centipawns or mate) per half-move in the `evaluations` table
- [ ] A per-Game `analyzed` flag is set once a Game is analyzed; re-analyzing an already-analyzed Game is a no-op (no duplicate evaluations, no re-run)
- [ ] `POST /api/analyze` analyzes only the not-yet-analyzed among the given `gameIds`, runs as a background job (returns without blocking), and is single-flighted (one job at a time)
- [ ] `GET /api/analyze/status` returns determinate progress `{ running, total, done }` that advances to `done === total` and then `running: false`
- [ ] `GET /api/games` exposes `analyzed` on each `Game`
- [ ] On "Mes parties", the Player can select Games and start an analysis; a progress indicator shows while it runs; analyzed Games show an "analysée" badge
- [ ] Search runs at a fixed depth (16); analysis blocks neither the API nor the UI while running
- [ ] Schema change only (new `evaluations` table + `games.analyzed`); no move-quality severity is stored and no `Danger position` table is created (both derived in slice 02); Import is unchanged
- [ ] No per-Move annotation on the Analyse board (US-7), no `/danger` view yet (slice 02)

### Feature Path (FP)

Runs against the app with the **fixture `Engine`** (runtime-selected) over a small offline fixture of
imported Games — **the real Stockfish is never invoked**.

1. Open the app on "Mes parties" with a few imported Games and the fixture engine active → none of the Games is marked "analysée".
2. Select one or more Games and start the analysis → a progress readout appears and advances to completion (every selected Game done).
3. When it finishes → the selected Games are marked "analysée"; starting the analysis again over the same selection reports nothing left to analyze (no re-analysis).
4. Confirm persistence → the analyzed Games have stored `Evaluation`s (one per half-move).

Verify: UI first — drive the selection + analysis + badge on "Mes parties" and read the progress. Probe the store only for step 4 (evaluations present) if the UI cannot establish it.

## Blocked by

None - can start immediately (`integration/US-4-danger-positions` is cut from up-to-date `develop`; the Game list and `GET /api/games` already exist).
