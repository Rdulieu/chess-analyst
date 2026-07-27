# US-4 — grilling notes (COMPLETE)

Business story **US-4**: Identifier mes positions dangereuses par analyse moteur
(Stockfish — `Mistake` et `Danger position`).

**Status: grilling closed.** Next steps: `/to-prd` (writes `.scratch/danger-positions/PRD.md`),
then `/to-issues` (2 slices, see Q7). Branch: `integration/US-4-danger-positions`.

## Decisions (Q1–Q7)

1. **Engine location — server-side local (ADR-0008, supersedes ADR-0001).** Engine runs in the local
   Node server in a `worker_thread`, behind a swappable **`Engine` interface** (UCI-shaped). Backends:
   **WASM-in-Node = default**, **native = opt-in** (`STOCKFISH_PATH`), **fake injected in tests**.

2. **Trigger — manual, separate, incremental pass** with **game selection**; per-Game **`analyzed`
   flag** (twin of `move_habits_computed`) → Evaluations computed once, never recomputed.

3. **Move quality — Lichess winning-chances method** (CONTEXT.md): drop of **10–20% / 20–30% / 30%+**
   = `Inaccuracy` / `Mistake` / `Blunder`. Player's own Moves only. **Mate** via win% saturation
   (~100%/0%). Search at **fixed depth 16**. cp→win% via standard public sigmoid (Lichess's exact
   regression is proprietary — method + thresholds match, not bit-for-bit).

4. **`Danger position`** (CONTEXT.md updated):
   - **Identity = 4-field FEN only** (transpositions merge, like `Move habit`); **no cadence, no
     player-side** scoping.
   - **Window = 10 half-moves** (~5 player moves) after a reach; a **tunable constant** (may test
     larger / variable later).
   - **"Serious error" umbrella = `Mistake` + `Blunder`** (≥20% drop); `Inaccuracy` excluded.
   - Two figures: reach count + serious-error proportion; **no minimum sample**; count always shown.
   - **Derived on the fly** from stored per-ply Evaluations — **no counter table**.

5. **Storage (ADR-0009)** — store **raw per-ply `Evaluation`s only** (table `evaluations`:
   `game_id, ply, cp|mate`), derive severities + Danger on the fly; `analyzed` flag on `games`. **No**
   severity column, **no** danger table. Lets thresholds/window/curve change with **no engine re-run**.

6. **Surfacing:**
   - **`/danger` page** + nav "Positions dangereuses": each Danger position = a board diagram
     (react-chessboard) + reach count + serious-error proportion; **sorted by reach count desc**,
     **highlight proportion ≥ 50%**.
   - **Per-Move annotation on the Analyse board is OUT of scope → deferred to new US-7** (on the
     `chore/backlog-sync` branch's backlog): `?!`/`?`/`??` + eval on Analyse, reusing US-4's stored
     evals, with an **on-by-default enable/disable toggle**. Depends on US-4.
   - **Analysis-pass UI**: selection (checkboxes) + "Analyser" on **Mes parties** (`/`), an
     **`analysed` badge** per Game; `POST /api/analyze` = **background job** + **determinate progress**
     via polling `GET /api/analyze/status` (no SSE).

7. **Decomposition — 2 vertical slices** (see PRD/`/to-issues`):
   - **Slice A — Analysis pass + storage**: engine host + `Engine` interface + WASM backend + fake;
     game selection UI; background job + progress; store per-ply Evaluations; `analyzed` flag/badge.
   - **Slice B — Danger positions**: on-the-fly derivation (Lichess severities + FEN-4 aggregate);
     `GET /api/danger`; `/danger` page. **Depends on A.**
   Engine infra lives inside A (no isolated horizontal "engine" slice).

## Files written during the grill
- `CONTEXT.md` — `Inaccuracy`/`Mistake`/`Blunder` (Lichess method); `Danger position` sharpened
  (FEN-4 identity, no cadence/side, 10-half-move window, Mistake+Blunder umbrella).
- `docs/adr/0008-*` — engine in local Node server behind `Engine` interface (supersedes ADR-0001).
- `docs/adr/0009-*` — store raw Evaluations, derive quality + Danger on the fly.
- `docs/adr/0001-*` — marked superseded by ADR-0008.
- `BACKLOG.md` on `chore/backlog-sync-us3-5-6` — **US-7** added (deferred Analyse annotations).
