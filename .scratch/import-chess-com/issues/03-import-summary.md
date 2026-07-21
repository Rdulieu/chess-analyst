# 03 — Import summary window

Status: ready-for-agent
Business ref: BACKLOG.md — US-2

**Integration branch.** Implemented on `integration/US-2-import-chess-com`: branch a `feature/*`
from it and merge back **into it** (auto-merge on a green local check), NOT into `develop`.

## Parent

`.scratch/import-chess-com/PRD.md` (US-2).

## What to build

A post-import summary the Player sees once an import finishes (not a preview — the games are
already retained). The relay's import returns a full summary and the UI renders it in a window.

- **Relay**: the import result becomes a full summary —
  `{ totalFetched, byCategory: {bullet, blitz, rapid, daily}, imported, alreadyPresent, results: {win, draw, loss} }`.
  `imported` vs `alreadyPresent` comes from the issue-01 dedup; `results` is the Player's W/D/L
  tally over the Games in scope.
- **UI**: a summary window showing total fetched, the per-cadence breakdown, how many Games were
  newly imported vs already present, and the win/draw/loss tally.

## Acceptance criteria

- [ ] The relay returns total fetched, a per-category breakdown, imported vs already-present counts, and a win/draw/loss tally.
- [ ] After an import, a summary window shows those figures.
- [ ] Re-importing an already-imported month reports its Games as already present, and no duplicate appears in the Game list.
- [ ] The per-cadence breakdown reflects the categories actually present in the imported month.

### Feature Path (FP)

UI-first, against the running app with the chess.com base URL pointed at a canned archive.

1. Import a month → a summary shows the total, a per-cadence breakdown, newly-imported vs already-present counts, and a win/draw/loss tally.
2. Import that same month again → the summary reports its Games as already present, and the Game list gains no duplicate.

Verify: UI first (the summary window's figures); the Game list confirms no duplication.

## Blocked by

- Issue 02 (import UI).
