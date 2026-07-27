# Danger position view — derive move quality and recurring danger Positions on the fly (/danger)

Status: done — auto-merged into `integration/US-4-danger-positions`. Green local check: build +
tests (server 86, client 67) + agentic Feature Path green against the real running app, seeded via
`npm run seed:danger` (offline, no engine): "after 1. e4 e5" 3 reached/33% not highlighted, "after
1. d4 d5" 2 reached/100% highlighted, the pre-3.Nc3 Position merged by transposition into one entry
(2 reached/0%, not highlighted, not duplicated); highlighting confirmed threshold-driven across all
20 entries (exactly the ≥50% ones flagged); empty-DB state showed the invitation only, no list. No
blocking finding (one non-blocking note: the starting Position sits at 43%, not 0%, because the
10-half-move look-ahead from ply 0 naturally catches the early blunders seeded in other Games — this
is correct derivation, not a bug, and was a wrong assumption in the FP briefing, not in the app).
`integration → develop` remains a human decision.

## Parent

`.scratch/danger-positions/PRD.md` (BACKLOG.md — US-4)

## Integration branch

Implemented on the business-story integration branch `integration/US-4-danger-positions` — **branch
from it and merge back into it, NOT `develop`**. Auto-merges into `integration/US-4-danger-positions`
after a green local check (build + tests + green FP, no blocking finding); the
`integration/US-4-danger-positions -> develop` merge stays a human decision.

## What to build

A **`Danger position` view** at **`/danger`**, deriving everything **on the fly** from the per-ply
`Evaluation`s that slice 01 stored — **no engine involved here**, no new stored aggregate (ADR-0009).

- **Move quality (Lichess winning-chances method).** For the Player's **own** Moves only, classify by
  the drop in **winning chances** between the `Evaluation` of the Position (best play) and that of the
  next Position (Move played), player-relative: **10–20% → `Inaccuracy`, 20–30% → `Mistake`, 30%+ →
  `Blunder`**. Convert centipawns → winning chances with the standard public sigmoid (Lichess's exact
  regression is proprietary — match method + thresholds, not bit-for-bit). **Mate** maps to ~100%/0%
  win chance, so drops stay bounded — no centipawn encoding of mate.
- **`Danger position` derivation.** Over the analyzed Games, group **reached Positions by their
  4-field FEN** (piece placement, active colour, castling, en passant — transpositions merge; **not**
  scoped by cadence or side). For each reach, look **10 half-moves ahead** for a **serious error** (a
  `Mistake` or `Blunder`; `Inaccuracy`s do **not** count). Produce two figures per Position: the
  **reach count** and the **serious-error proportion**. **No minimum sample size** (the reach count is
  always shown beside the proportion). The 10-half-move window is a **tunable constant**.
- **`GET /api/danger`** returns the entries **sorted by reach count descending**.
- **`/danger` page** + a "Positions dangereuses" nav entry (route reserved by ADR-0006). Each entry is
  a **static board diagram** (`react-chessboard`, already a dependency) rendered from the FEN, with
  its reach count and serious-error proportion; entries with **proportion ≥ 50%** are highlighted.
  With no analyzed Games, an **invitation** to run an analysis (no table).

API contract (shape, not fixed values):

```
GET /api/danger → { dangers: [ { fen, reached, seriousErrors, proportion } ] }   // sorted by reached desc
```

## Acceptance criteria

- [x] Move quality is classified by winning-chances drop (Lichess method) — 10–20% `Inaccuracy`, 20–30% `Mistake`, 30%+ `Blunder` — for the Player's own Moves only, comparing the Position's eval (best) with the next Position's eval (played)
- [x] A Move is not flagged when it drops the chances by < 10%, nor when the Player is already (near-)winning/lost (winning chances saturate) — no flag from a negligible change
- [x] Mate is handled via winning chances (~100%/0%), never an arbitrary centipawn value
- [x] `Danger position`s are grouped by 4-field FEN so transpositions merge; they are not scoped by time control category or by the side the Player played
- [x] For each reached Position, a serious error (`Mistake` or `Blunder`, not `Inaccuracy`) within the following 10 half-moves counts toward its proportion
- [x] Each entry carries a reach count and a serious-error proportion; no minimum sample size is enforced; the count is always shown beside the proportion
- [x] `GET /api/danger` returns entries sorted by reach count descending
- [x] Everything is derived on the fly from the stored `evaluations` — no `Danger position` table, no stored severity, no engine call on this path
- [x] The `/danger` page renders each Position as a board diagram with its reach count and proportion, sorted by reach count descending
- [x] Entries with a serious-error proportion ≥ 50% are visibly highlighted (perceivable without relying on colour alone — the client ships no stylesheet)
- [x] With no analyzed Games, `/danger` shows an invitation to run an analysis — no table
- [x] A "Positions dangereuses" nav entry and the `/danger` route are added; the app-level routing test asserts the page renders on the route
- [x] `npm run seed:danger` seeds a deterministic offline fixture of Games **with pre-stored per-ply `Evaluation`s** (no engine), covering several recurring Positions incl. at least one transposition, at least one Position with a ≥50% serious-error proportion and one below, and an unclassified/empty case

### Feature Path (FP)

Runs against the app seeded with **pre-stored `Evaluation`s** (`npm run seed:danger`, offline) — **no
engine is invoked**.

1. Launch the app seeded with the danger fixture → navigate to "Positions dangereuses" (`/danger`).
2. Read the list → recurring Positions are shown as board diagrams, each with its reach count and serious-error proportion, ordered by reach count descending; the figures match the fixture.
3. Confirm the highlight and merge → Positions with a serious-error proportion ≥ 50% are visibly highlighted (and lower ones are not); Positions reached via different move orders appear as a single merged entry (transposition).
4. Confirm the empty state → on a database with no analyzed Games, `/danger` shows the invitation, no table.

Verify: UI first — read the diagrams and figures on `/danger`. Probe `GET /api/danger`/the store only if the UI cannot establish a figure.

## Blocked by

- `01-analysis-pass` — needs the per-ply `Evaluation`s it stores (the `evaluations` table). This slice's own FP runs on seeded evaluations, but the feature derives from slice 01's storage shape.
