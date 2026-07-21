---
id: HP-02
covers: [Move habit, Position, Move, Import]
---

# HP-02 — Explore my move habits

## Goal
After importing a month of their real chess.com history, the Player opens the Move habit
explorer for a side, reads which Moves they've actually played from the starting Position (with
frequency, win rate and per-cadence breakdown), and drills down level by level — via the list
and via the board arrows — with a breadcrumb tracking the path. This is US-5's core value:
surfacing the Player's own habits across their whole imported history.

> Run against the **real chess.com API** (not a fixture archive), on top of a real Import. The
> deterministic frequency/rate assertions live in the sub-issues' fixture-based Feature Paths;
> here, on real data, assert **shape and internal consistency**, not fixed numbers.

## Drive-by
- Navigation: reaching the explorer as its own page from the app's navigation.
- Whole-history aggregation: the explorer reflects all imported Games, with no per-run scope selector.
- Depth cap: no further descent is offered past 20 full moves (40 Moves).

## Preconditions
- App started locally, talking to the **real** chess.com API (no `CHESSCOM_BASE_URL` override).
- **Clean data state**: a fresh local database, so the precomputation runs over exactly the
  Games imported in this run. Reset the local database file before running.
- Reference account: the Player's username **`DudulSmash`**, month **2026/06** (immutable past
  month, 54 games: 48 blitz + 6 bullet, all standard chess).

## Journey
1. Import `DudulSmash` for 2026/06 (Blitz + Bullet) → the import completes with a summary.
2. Navigate to the Move habit explorer page and choose a side (e.g. White) → candidate Moves from the starting Position are shown.
3. Read the candidates → each shows a frequency, a win rate, and a per-time-control-category breakdown; the exact count behind each is visible.
4. Observe the board → the candidate Moves are also drawn as arrows, with visibly varying thickness (frequency) and color (win rate).
5. Descend one level by selecting a candidate **in the list** → the explorer shows the candidates played from the resulting Position, and the breadcrumb reflects the Move taken.
6. Descend a further level by clicking a candidate **arrow on the board** → the explorer descends exactly as the list would, and the breadcrumb reflects the second Move.
7. Select an earlier entry in the breadcrumb → the explorer returns to that level.
8. Switch the side selector to Black → the candidates from the starting Position update to the Black-side habits.

## Checks
### UI
- Step 2: the explorer is a distinct page reached via navigation; a side selector is present; at least one candidate Move is shown from the starting Position (the account has real games).
- Step 3: every candidate shows a frequency, a win rate, and a per-cadence breakdown; the win rate is consistent with standard scoring `(wins + 0.5·draws)/games` and lies within 0–100%; the per-cadence counts sum to the candidate's game count; no candidate is hidden for a small sample.
- Step 4: each listed candidate has a corresponding board arrow; arrow thickness differs between a more- and a less-played candidate, and color differs across the 50% win-rate threshold.
- Step 5: selecting a list candidate replaces the shown candidates with those from the resulting Position; the breadcrumb gains that Move.
- Step 6: clicking a board arrow produces the **same** descent + breadcrumb update as the corresponding list entry would.
- Step 7: selecting an earlier breadcrumb entry returns to that level, discarding deeper navigation.
- Step 8: switching side changes the starting-Position candidates to the other color's habits.
- Depth: once 40 Moves (20 full moves) deep, no further descent is offered.

### Backing store (optional)
- The Move habit aggregate holds one entry per (Position FEN, side, Move) with counters whose
  win/draw/loss parts sum to the entry's total; each imported Game is flagged as computed exactly
  once (no double counting).

## Cleanup (best-effort)
- The run imports real Games into the local database. To re-run from a clean state, reset the
  local database file (it is recreated empty on next launch).

## Notes
- **Real network dependency**: needs chess.com reachable; a rate-limit or outage surfaces as an
  import failure, which is an environment finding, not an app defect.
- Use an **immutable past month** (2026/06) so the imported set — and therefore the habits — are
  stable across runs.
- Assert the **shape and internal consistency** of frequencies/rates (counts present, parts sum,
  rate in range, list/arrow parity), never fixed numbers — the real games drive the values.
