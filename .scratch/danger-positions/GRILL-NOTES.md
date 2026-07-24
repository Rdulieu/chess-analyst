# US-4 — grilling notes (PAUSED, resume later)

Business story **US-4**: Identifier mes positions dangereuses par analyse moteur
(Stockfish — `Mistake` et `Danger position`).

**How to resume:** re-run `/grill-with-docs US-4` (or just re-read this file) on branch
`integration/US-4-danger-positions`. Pick up at **Q4** below. Nothing is on the technical backlog
yet — `/to-prd` then `/to-issues` come *after* the grill closes.

## Decisions locked (Q1–Q3)

1. **Engine location — server-side local (ADR-0008, supersedes ADR-0001).** The engine runs in the
   **local Node server** in a `worker_thread`, behind a swappable **`Engine` interface** (UCI-shaped
   `evaluate(fen, limit) → { cp | mate, bestmove }`). Backends: **WASM-in-Node = default** (no native
   install; multi-thread reachable since Node has SharedArrayBuffer without COOP/COEP), **native
   Stockfish = opt-in** via `STOCKFISH_PATH` (same UCI driver; only cost is provisioning the binary),
   **fake `Engine` injected in tests** (mirrors the injected chess.com client, ADR-0002). Rationale:
   ADR-0001's "no server engine" targeted a *hosted* backend; here the server is the player's own
   local process, and all heavy compute is already server-side (ADR-0005).

2. **Analysis trigger — manual, separate, incremental pass** (NOT grafted onto the network-bound
   Import). The player **selects the Games to analyze**; a per-Game **`analyzed` flag** (twin of
   `move_habits_computed`) skips already-analyzed Games → `Evaluation`s computed once, retained,
   never recomputed. Runs in the worker_thread with progress.

3. **Move-quality terms — Lichess method (CONTEXT.md updated).** `Inaccuracy` / `Mistake` /
   `Blunder` classified by **winning-chances drop**, not raw centipawns: **10–20% / 20–30% / 30%+**.
   Computed only for the **player's own** Moves, comparing position before (engine best) vs after the
   played Move. **Mate** handled naturally: mate → win% ≈ 100% (or 0% when getting mated), so the drop
   stays bounded in [0,100%] — no arbitrary centipawn encoding. Search at **fixed depth 16**
   (reproducible). cp→win% via the **standard public sigmoid** (Lichess's exact regression is
   proprietary — we match method + thresholds, not bit-for-bit).

## Open questions (resume here)

### Q4 — `Danger position` specifics
- **Position identity**: reuse the **4-field FEN** key (like `Move habit`, ADR-0005) so
  transpositions merge? Glossary scopes it **to a single time control category** → key likely
  `(fen4, cadence)`. (Side? glossary doesn't scope by side — confirm.)
- **"within the following 10 moves"**: 10 **half-moves** or 10 **full moves**? (Move-habit depth cap
  is expressed as 40 half-moves = 20 full moves — pick one convention and state it.)
- **Which severities the "Mistake" umbrella counts**: strictly `Mistake`, or `Mistake` + `Blunder`
  (serious errors), or all three incl. `Inaccuracy`? *Lean: Mistake + Blunder.* (CONTEXT.md flags
  this as "stated where used".)
- **The two figures**: reached count + proportion of reaches where such an error occurred within the
  window. No minimum sample (glossary). Count always shown beside the proportion.
- **Precompute vs on-the-fly**: aggregate at analysis time (a Danger counter table, like ADR-0005) or
  derive on read from stored per-Move Evaluations/Mistake flags (like stats/weak-openings)? *Lean:
  derive on the fly from stored flags if cheap enough; else a small aggregate built during the
  analysis pass.*

### Q5 — Storage schema
- Per-Move **`Evaluation`** (cp or mate) — one row per ply, per Game? And per **player** Move a
  **severity** flag (none/inaccuracy/mistake/blunder). The `analyzed` flag on `games`. Whether the
  `Danger position` aggregate is stored or derived (ties to Q4).

### Q6 — Surfacing & route
- A dedicated **`/danger`** route + nav entry (ADR-0006 reserved one for `Danger position`).
- **Drive-by?** Also annotate move quality (?!/?/??) on the **Analyse** board while reviewing a Game?
  In scope for US-4 or a later story? (The story headline is Danger *positions*; per-game annotation
  is adjacent.)
- The **analysis-pass UI**: Game selection + progress indicator (SSE was deferred in US-2 — likely
  indeterminate progress again).

### Q7 — Decomposition & remaining ADRs
- Likely **several** issues (engine host + `Engine` interface & fake; analysis pass + persistence;
  `Danger position` aggregate + `/danger` page). Tracer-bullet slicing to be worked at `/to-issues`.
- Possible **second ADR** for the Mistake-method/threshold+severity specifics once Q4 closes (or fold
  into the PRD).

## Files already written this session
- `CONTEXT.md` — `Inaccuracy`/`Mistake`/`Blunder` defined (Lichess winning-chances method).
- `docs/adr/0008-engine-runs-in-local-node-server.md` — new (supersedes ADR-0001).
- `docs/adr/0001-*.md` — marked superseded by ADR-0008.
