# 01 — Decompose generic files into feature-oriented modules

Status: ready-for-agent
Type: technical (refactor, behaviour-preserving)

**Integration branch.** Play it on `integration/US-2-import-chess-com`: branch a `feature/*` from
that branch (it carries the code produced by US-2's issues 01 + 02) and merge back **into it** on a
green local check, so the cleanup rides to `develop` together with US-2. If US-2 has already merged
into `develop` by the time this is played, branch from up-to-date `develop` instead.

## Parent

None (standalone technical story). Refactors the code produced by `.scratch/import-chess-com/`
issues 01 (import backend) and 02 (import UI).

## What to build

Nothing new for the Player — a **behaviour-preserving refactor**. The code currently lives in a few
generic catch-all files (`client/src/App.tsx` is a god-component; `server/src/import.ts` mixes
service + pure mapping + error + types; routes all sit in `server/src/app.ts`; `types.ts` is a
grab-bag). Reorganise into feature-oriented modules so import, games (and later openings, danger
positions) each have a clear home, and the densest logic (chess.com → Game mapping) is isolated and
independently testable.

The tests are the safety net: they assert observable behaviour, not structure, so they must survive
the move **unchanged** (imports/paths aside). If a test needs rewriting to keep passing, the
refactor changed behaviour — stop and reconsider.

### Client target structure

```
client/src/
  App.tsx                  # thin: layout + selected game, composes the features
  main.tsx
  api/ games.ts            # fetchGames, fetchGame
       import.ts           # importGames
  features/
    import/ ImportForm.tsx # form state + submit + status        (out of App)
    games/  GameList.tsx   # list + selection callback           (out of App)
            GameViewer.tsx # selected game details + <Board>      (out of App)
  components/ Board.tsx     # generic board (unchanged)
  chess/ history.ts         # PGN parsing (unchanged)
  types/ game.ts            # Game, TimeControlCategory
         import.ts          # ImportParams, ImportResult
```

### Server target structure

```
server/src/
  main.ts                  # wiring/entry (unchanged)
  app.ts                   # thin: create express, mount routers
  routes/ games.ts         # GET /api/games, /:id
          import.ts        # POST /api/import
  chesscom/ types.ts       # ChessComGame, ChessComClient (interface)
            httpClient.ts   # createHttpChessComClient
  import/ service.ts        # importMonth (orchestration)
          mapping.ts        # toGame, normalizeResult, DRAW_CODES  (pure, isolated)
          errors.ts         # UnknownUsernameError
  db/ (index.ts, schema.ts) # unchanged
  repository.ts             # unchanged (becomes repository/games.ts when US-4 lands)
```

### Priority within this story

1. **High — do:** break up `App.tsx` (`ImportForm` + `GameList` + `GameViewer`, thin `App`); isolate `server/src/import/mapping.ts` (pure functions) from the service.
2. **Medium — include if cheap:** feature routers (`routes/games.ts`, `routes/import.ts`); split `api.ts` and `types.ts` by domain.
3. **Do NOT over-do:** splitting `chesscom.ts` types vs impl is cosmetic for now (one cohesive boundary) — leave until a second call justifies it. No client-side hook/service layer or state manager — premature for a solo tool.

## Acceptance criteria

- [ ] `App.tsx` is a thin orchestrator: import form, game list, and game viewer are separate components.
- [ ] The chess.com → Game mapping (side, win/loss/draw, opponent, date, category) lives in its own pure module, independently unit-tested.
- [ ] The existing server and client test suites pass **unchanged** in behaviour (only import paths may change); build (`npm run build`) and lint (`npm run lint`) are green.
- [ ] No user-facing behaviour changes: the US-2 import journey works exactly as before.
- [ ] Priority-1 extractions are done; priority-2 done where cheap; priority-3 explicitly left alone.

### Feature Path (FP)

Behaviour-preserving, so the gate is the **US-2 nominal journey still passing unchanged** (UI-first,
app pointed at a fixture archive):

1. Empty history → invitation to import; enter a username, pick a month + categories, import → the month's Games appear.
2. Open an imported Game → its Moves are navigable on the board.
3. An unknown username → a clear error, nothing stored.

Verify: UI first (same journey as issue 02); the whole existing test suite green is the real
regression proof.

## Blocked by

- `.scratch/import-chess-com/` issue 02 (import UI) — this refactors 01 + 02's code, so play it once the current slice is finished and merged into the integration branch.
