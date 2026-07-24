# Danger positions & engine analysis — find where I go wrong

Status: ready-for-agent
Business ref: BACKLOG.md — US-4
Integration branch: `integration/US-4-danger-positions` (cut from up-to-date `develop`).
Decisions: **ADR-0008** (engine runs in the local Node server behind a swappable `Engine` interface;
supersedes ADR-0001) and **ADR-0009** (store raw per-ply `Evaluation`s; derive move quality and
`Danger position`s on the fly). Glossary terms (CONTEXT.md): `Evaluation`,
`Inaccuracy`/`Mistake`/`Blunder` (Lichess winning-chances method), `Danger position`. Dev-phase
rules apply (schema change + re-import backfill are fine).

## Problem Statement

The Player can see which `Opening`s and `Move habit`s work for them (US-3, US-5), but nothing tells
them **where they actually go wrong**: the Moves that throw games away, and the Positions they
mishandle over and over. The app has **no engine analysis at all** yet — the `games` schema even
notes "No Evaluation/Mistake storage yet — that arrives with US-4." Without it, the Player cannot
turn their imported history into "here is the recurring situation where I keep blundering — study
this."

## Solution

Add **engine analysis**, computed by the **local Node server** (Stockfish in a `worker_thread`,
behind a swappable `Engine` interface — ADR-0008), driven by the Player, not the network Import.

- **A manual, incremental analysis pass.** On "Mes parties" the Player **selects Games** and starts
  an analysis. The server evaluates **every Position** of each selected Game and stores **one raw
  `Evaluation` per half-move** (ADR-0009). It runs as a **background job** with **determinate
  progress** ("3/10 parties analysées"); already-analyzed Games are skipped (an `analyzed` flag), so
  `Evaluation`s are computed **once and never recomputed** (Import glossary term). Each Game shows an
  **"analysée" badge**.
- **A `Danger position` view (`/danger`).** From the stored `Evaluation`s the app derives — **on the
  fly** — the Player's move quality (`Inaccuracy`/`Mistake`/`Blunder`, Lichess winning-chances
  method) and the `Danger position`s: recurring Positions (**4-field FEN**, transpositions merged)
  where, within the **following 10 half-moves** of reaching them, the Player commits a **serious
  error** (`Mistake` or `Blunder`). Each is shown as a **board diagram** with two figures — how many
  times reached, and the proportion of reaches that led to a serious error — sorted by reach count,
  with the high-proportion ones highlighted. No minimum sample size.

Because only **raw `Evaluation`s** are stored, thresholds, the 10-half-move window and the
cp→winning-chances curve can all change later **without re-running the engine**.

This is delivered in **two vertical slices**: **A** (analysis pass + storage) then **B** (Danger
positions view, depends on A).

## User Stories

1. As the Player, I want to select specific Games from my list and run an engine analysis on them, so that I choose what to spend analysis time on rather than analyzing everything blindly.
2. As the Player, I want the analysis to run without freezing the app, so that I can keep using it while it works.
3. As the Player, I want a clear progress readout ("3 of 10 analyzed"), so that I know how far along a long analysis is.
4. As the Player, I want each Game to show whether it has been analyzed, so that I can see at a glance what is left to do.
5. As the Player, I want re-running analysis to skip Games already analyzed, so that I never pay to recompute the same `Evaluation`s.
6. As the Player, I want my analyzed `Evaluation`s retained across sessions, so that the work persists and the derived views are instant.
7. As the Player, I want my Moves classified as `Inaccuracy`, `Mistake` or `Blunder` the way Lichess does it (by how much they drop my winning chances), so that the classification matches a standard I trust.
8. As the Player, I want only my **own** Moves classified (never my opponent's), so that the feedback is about my improvement.
9. As the Player, I want walking into (or throwing away) a forced mate to be treated sensibly, so that mate situations are classified, not mis-scored.
10. As the Player, I want a `Danger position` view listing the recurring Positions where I tend to go wrong soon after, so that I know which situations to study.
11. As the Player, I want each `Danger position` shown as a board diagram, so that I recognise the Position at a glance (a FEN string would be unreadable).
12. As the Player, I want each `Danger position` to show how many times I reached it and in what proportion I then made a serious error, so that I can judge both how common and how dangerous it is.
13. As the Player, I want the exact reach count shown beside the proportion, so that I can judge a proportion's significance myself (no minimum sample size).
14. As the Player, I want positions I reach via different move orders merged into one `Danger position` (transpositions), so that the same situation is not split into near-duplicates.
15. As the Player, I want the danger list sorted by how often I reach each Position, so that the most relevant (most-encountered) situations lead.
16. As the Player, I want the most dangerous Positions (high error proportion) highlighted, so that they stand out wherever they sit in the list.
17. As the Player, I want only serious errors (`Mistake` or `Blunder`, not `Inaccuracy`) to make a Position "dangerous", so that minor imprecisions do not inflate the signal.
18. As the Player, when I have not analyzed any Games, I want the `/danger` view to invite me to run an analysis rather than show an empty table, so that the empty state is not confusing.
19. As the Player, I want to reach the danger view from the navigation and at `/danger` directly, so that it has its own address.
20. As a developer, I want the engine to run in the local Node server behind an `Engine` interface, so that the engine backend (WASM now, native later) can change without touching analysis/danger logic.
21. As a developer, I want the `Engine` faked/selectable at runtime, so that tests and the agentic Feature Paths are deterministic and never depend on the real Stockfish (an external dependency).
22. As a developer, I want to store only raw per-ply `Evaluation`s and derive severities and danger on the fly, so that changing thresholds or the window needs no engine re-run.
23. As a developer, I want an optional native Stockfish backend via `STOCKFISH_PATH`, so that anyone who installs the binary gets more depth/throughput without changing the app.
24. As a developer picking up US-7 later, I want the per-Move annotation on the Analyse board kept out of US-4, so that this story stays focused on the analysis pass and the aggregate danger view.

## Implementation Decisions

### Engine (ADR-0008)
- The engine runs **in the local Node server, in a `worker_thread`**, behind an **`Engine`
  interface** (UCI-shaped: evaluate a FEN to a fixed **depth 16** → `{ cp | mate, bestmove }`).
- **Backends**: **WASM-in-Node = default** (npm-only, no native install); **native = opt-in** via
  `STOCKFISH_PATH` (same UCI driver); **injected fake / fixture backend** selectable at runtime
  (env), mirroring `CHESSCOM_BASE_URL` — so tests and Feature Paths are deterministic and never
  invoke the real Stockfish.

### Analysis pass + storage (ADR-0009) — Slice A
- **Trigger**: manual, from the Game list ("Mes parties"). The Player selects Games (checkboxes) and
  starts the analysis. **Not** grafted onto Import.
- **Execution**: `POST /api/analyze` starts a **background job** (the worker) over the not-yet-
  analyzed among the selected Games and returns immediately; the client polls
  `GET /api/analyze/status` for **determinate progress** (done/total). Only **one** job at a time.
- **What is computed & stored**: for each analyzed Game, evaluate **every Position** (each ply — the
  quality of a player Move needs the eval of its Position *and* of the next Position), and store one
  raw `Evaluation` per half-move. A per-Game **`analyzed` flag** (twin of `move_habits_computed`)
  makes the pass incremental and idempotent.
- **Schema** (dev-phase — migration + re-analyze, no backfill machinery): a new **`evaluations`**
  table, one row per analyzed ply `(game_id, ply index, cp | mate)`; an **`analyzed`** boolean on
  `games`. **No** severity column, **no** danger table (both derived).
- **Game shape**: the `Game` returned by `GET /api/games` gains an `analyzed` field (for the badge).

### Move quality + Danger derivation (ADR-0009) — Slice B
- **Move quality**: classify by **winning-chances drop** (Lichess method), computed only for the
  Player's own Moves by comparing the `Evaluation` of the Position (best play) with that of the next
  Position (Move played), player-relative: **10–20% → `Inaccuracy`, 20–30% → `Mistake`, 30%+ →
  `Blunder`**. cp→winning-chances via the standard public sigmoid (Lichess's exact regression is
  proprietary — method + thresholds matched, not bit-for-bit). **Mate** maps to ~100%/0% win chance,
  so drops stay bounded — no centipawn encoding.
- **`Danger position`**: derived **on the fly** over the analyzed Games — group reached Positions by
  **4-field FEN** (transpositions merge; not scoped by cadence or side), and for each occurrence look
  **10 half-moves** ahead for a **serious error** (`Mistake` or `Blunder`). Two figures: reach count
  and serious-error proportion. No minimum sample. The 10-half-move window is a **tunable constant**.
- **`GET /api/danger`** returns the entries **sorted by reach count descending**.
- **`/danger` page**: a new route + "Positions dangereuses" nav entry (route reserved by ADR-0006).
  Each entry renders a **static board diagram** (`react-chessboard`, already a dependency) from the
  FEN, the reach count and the proportion; rows with proportion **≥ 50%** are highlighted. With no
  analyzed Games, an **invitation** to run an analysis (no table).

### API contracts (shape, not fixed values)
```
POST /api/analyze  { gameIds: number[] }   → 202, { running, total, done }   // starts the job over the unanalyzed gameIds
GET  /api/analyze/status                    → { running: boolean, total, done }
GET  /api/danger                            → { dangers: [ { fen, reached, seriousErrors, proportion } ] }  // sorted by reached desc
GET  /api/games                             → Game[] now includes `analyzed: boolean`
```

## Testing Decisions

Good tests assert observable behaviour — what the classifier returns, what the endpoints return,
what the pages render — never the engine's internals. **Stockfish is an external dependency and is
never under test**: it is faked/injected everywhere below the HP tier (exactly as the chess.com
client is faked — ADR-0002).

- **Move-quality classifier (pure)** — unit: given best/played `Evaluation`s (incl. mate), assert the
  winning-chances drop and the `Inaccuracy`/`Mistake`/`Blunder` band, the "not flagged when already
  winning/lost" behaviour, and mate handling. Prior art: `mapping.test`, the win-rate primitive.
- **Analysis service** — against a **fake `Engine`** + `:memory:` SQLite: walk a fixture Game, assert
  one `Evaluation` per ply is stored, the `analyzed` flag is set once, and re-running is a no-op.
  Prior art: `move-habits.test` (precompute), the injected `fakeClient`.
- **Danger derivation** — repository against `:memory:` seeded with **pre-stored `evaluations`** (no
  engine): assert 4-field-FEN grouping (transpositions merge), reach counts, the 10-half-move serious-
  error window, proportion, and reach-count-descending sort. Prior art: `openings.test`, `stats.test`.
- **API** — supertest: `POST /api/analyze` + `GET /api/analyze/status` with a **fake `Engine`
  injected** into the app (assert the pass runs and progress advances); `GET /api/danger` for a
  seeded set; `GET /api/games` exposes `analyzed`. Prior art: `api.test`.
- **Client** — mocked `fetch`: the Game-list **selection + "Analyser" + progress + "analysée"
  badge**; the **`/danger` page** (board diagrams, reach/proportion, sort, ≥50% highlight, empty-state
  invitation); the app-level routing test gains a `/danger` assertion. Prior art: `ImportForm`/
  `ImportSummary`, `OpeningsPage`/`StatsPage`, `App.test`.
- **Test pyramid apex — Feature Paths (agentic, deterministic, NO real Stockfish)**:
  - **Slice A FP**: the real app with the **fixture `Engine`** (runtime-selected) over a tiny fixture
    → select Games, run the analysis, watch progress reach N/N, see Games flip to "analysée", and
    confirm `Evaluation`s were stored. Asserts *our* pass, not Stockfish.
  - **Slice B FP**: the real app seeded with a **pre-stored `evaluations` fixture** (`seed:danger`,
    no engine) → `/danger` shows the expected `Danger position`s with exact reach counts and
    proportions, the ≥50% highlight, the reach-count-descending order, and the empty-state invitation
    on an unanalyzed database.
- **Happy Path**: **optionally** an HP that exercises the **real Stockfish** end to end (analyze a
  real imported Game, sanity-check the pass completes and evals look plausible) — analogous to HP-01
  hitting the real chess.com. Proposed at the `integration → develop` MR (HP budget is 3/3 today, so
  this would mean merging/curating), **not owed by this PRD**.

## Out of Scope

- **Per-Move annotations on the Analyse board** (`?!`/`?`/`??` + eval while reviewing a Game) — that
  is **US-7** (deferred during this grill; reuses US-4's stored `Evaluation`s, with an on-by-default
  toggle).
- **Auto-analysis on Import** — the pass stays manual and separate.
- **A precomputed `Danger position` counter table** — rejected in ADR-0009 (derive on the fly so the
  window/thresholds stay tunable).
- **Multi-threaded WASM or native as the default backend** — WASM single-thread is the default;
  native is opt-in via `STOCKFISH_PATH`.
- **`Opponent` move classification, opening-book awareness, "best line" display, accuracy %,
  centipawn-graph** — not part of the danger-focused story.
- **Sharing/cloud analysis** — everything stays local (ADR-0002).
- **Bundling the Stockfish native binary** — opt-in via an installed binary only.

## Further Notes

- The two-treatment split mirrors US-3: **precompute the expensive external artifact** (the engine
  `Evaluation`s, once per Game) and **derive the cheap aggregates on read** (severities, danger).
- The `analyzed` flag is the analysis twin of `move_habits_computed` (ADR-0005) — same
  idempotency/double-count guard rationale.
- Evaluating **every** Position (not just the Player's Moves) is required: a Move's quality is the
  drop between its Position's eval and the next Position's eval, i.e. two consecutive plies.
- Likely more than two issues if `/to-issues` splits Slice A's engine host from the pass UI; the
  recommendation is to keep the engine host **inside** Slice A (an isolated engine slice would be
  horizontal / not demoable).
- Move `BACKLOG.md` US-4 to "Doing" with this PRD path + branch when `/to-issues` runs (the backlog
  bookkeeping currently lives on the pending `chore/backlog-sync-us3-5-6` branch).
