# Weak opening page — win rate per opening, by side and cadence

Status: done — auto-merged into `integration/US-3-weak-openings`. Green local check: build +
tests (server 57, client 59) + agentic Feature Path green on the offline `seed:openings` fixture
(Sicilian B22 Blancs/blitz 3 · 33% highlighted; Italian C50 Blancs/rapid 100%; French C00
Noirs/blitz 50% not highlighted; Autre/other bullet 0% highlighted; ordered by games desc,
internally consistent), no blocking finding. One FP finding (weak-opening highlight not visually
rendered — the app ships no CSS) fixed in 754125c before merge (inline tint + accessible "à
revoir" ⚠ marker). `integration → develop` remains a human decision.

## Parent

`.scratch/weak-openings/PRD.md` (BACKLOG.md — US-3)

## Integration branch

This sub-issue is implemented on the business-story integration branch
`integration/US-3-weak-openings` — **branch from it and merge back into it, NOT `develop`**. It
auto-merges into `integration/US-3-weak-openings` after a green local check (project build + tests
+ green FP, no blocking finding); the `integration/US-3-weak-openings -> develop` merge stays a
human decision. The branch already carries the grilling output (CONTEXT.md `Opening` term,
ADR-0007) and this PRD.

## What to build

A dedicated **`/openings` page** ("Ouvertures") listing every `Opening` the Player has actually
played, aggregated over their whole imported history — one row per **(Opening, side, cadence)**
entry (the granularity the `Weak opening` glossary term fixes: "White Sicilian in blitz" and
"White Sicilian in rapid" are two entries). Each row shows the opening name and its ECO code, the
side (Blancs/Noirs), the cadence (bullet/blitz/rapid/daily), the game count, the win/draw/loss
tally and the `Win rate`. Rows with a `Win rate` **under 50% are highlighted**. The table is
**sorted by game count descending**. No minimum sample size is enforced (the count sits next to
every rate). With no imported Games, the page shows an **invitation message only**.

End-to-end, this slice cuts through every layer:

- **Store the opening on the Game at import (ADR-0007).** Add `eco` (ECO code — the `Opening`
  identity) and `openingName` (human-readable) columns to `games`, populated at import from the
  PGN's `[ECO]`/`[ECOUrl]` headers. This trusts chess.com's own classification (as the time control
  category already does); we do **not** recompute ECO. Extraction is a **pure function**
  (`parseOpening(pgn)` or similar) called inside the import mapping: reads `[ECO]` for the code,
  derives the name from the `[ECOUrl]` slug; returns the sentinel `eco = "other"` /
  `openingName = "Autre / non classée"` when no `[ECO]` header is present. Backfill of pre-existing
  local rows is by **re-import** — no migration/backfill machinery (dev-phase rule, `CLAUDE.md`).
- **Extract the `Win rate` primitive to a neutral shared module.** Move the `Bucket` type
  (`{ games, win, draw, loss, winRate }`) and its computation (`(win + 0.5·draw)/games`, `null` when
  `games === 0`) out of US-6's stats repository into a module both features depend on, and re-point
  US-6's stats repository at it — **behaviour-preserving** (US-6's tests keep passing). This avoids a
  false US-3 → US-6 dependency edge (ADR-0007). Compose the opening row shape around the primitive
  rather than widening a shared type.
- **New read endpoint `GET /api/openings`.** On-the-fly aggregation over `games`
  (`GROUP BY eco, player_color, time_control_category`), **no new table, no precomputation**. Returns
  the entries sorted by game count descending. `win/draw/loss` are Player-relative (the
  `games.result` column already is).

  API contract (shape, not fixed values):

  ```
  GET /api/openings →
  {
    openings: [
      { eco, openingName, side, cadence, games, win, draw, loss, winRate }
      // side: "white" | "black"; cadence: "bullet" | "blitz" | "rapid" | "daily"
      // winRate always present (an entry only exists if games >= 1); sorted by games desc
    ]
  }
  // empty history → { openings: [] }
  ```
- **`OpeningsPage` (client, new).** Fetches `/api/openings` on mount; renders a flat table
  (Ouverture = name · ECO · Côté · Cadence · Parties · V/N/D · Win rate), highlights rows with
  `winRate < 0.5`, shows the invitation message when `openings` is empty, spells out the V/N/D tally
  for assistive tech (as `StatsPage`/`ImportSummary`). No "Total" line (that belongs to `/stats`).
- **Navigation + route.** Add a `/openings` route and an "Ouvertures" nav entry alongside Mes
  parties / Explorateur / Stats (route reserved for `Weak opening` by ADR-0006).
- **FP fixture (new).** A dedicated seed (`npm run seed:openings`) of short Games whose PGNs carry
  real `[ECO]`/`[ECOUrl]` headers, spanning several openings across both sides and multiple cadences,
  with at least one opening below 50% and one at/above, plus at least one unclassified (no `[ECO]`)
  Game feeding the **Other** entry. Reuse the same standalone opening-extraction + insertion path as
  the real import (one logic, two entry points — cf. ADR-0005 fixture pattern).

## Acceptance criteria

- [ ] `games` has `eco` and `openingName` columns, populated at import from the PGN `[ECO]`/`[ECOUrl]` headers via a pure, unit-tested extraction function
- [ ] A Game with no `[ECO]` header is stored with `eco = "other"` (never `null`); malformed/partial headers degrade to `"other"` rather than throwing
- [ ] The opening name is derived from the `[ECOUrl]` slug (e.g. `.../Sicilian-Defense-Alapin-Variation` → "Sicilian Defense: Alapin Variation")
- [ ] The `Win rate` primitive (`Bucket` + `(win + 0.5·draw)/games`, `null` on 0 games) lives in a neutral shared module; US-6's stats repository is re-pointed at it with its behaviour and tests unchanged
- [ ] `GET /api/openings` returns one entry per (eco, side, cadence) actually played, each `{ eco, openingName, side, cadence, games, win, draw, loss, winRate }`, sorted by `games` descending
- [ ] Only entries with `games >= 1` are returned (no zero-filled cross-product); every returned entry has a non-null `winRate`; an empty history returns `{ openings: [] }`
- [ ] `Win rate` is `(win + 0.5·draw)/games` (Player-relative); each entry's win+draw+loss equals its games
- [ ] Unclassified Games aggregate under a single `eco = "other"` entry (still split by side/cadence)
- [ ] The `/openings` page renders the table (opening name · ECO, side, cadence, games, spelled-out V/N/D, `Win rate`), sorted by game count descending
- [ ] Rows with `Win rate` under 50% are visually highlighted; rows at/above 50% are not
- [ ] With no imported Games, `/openings` shows an invitation message only — no table
- [ ] The win/draw/loss tally is spelled out for assistive technology (as in `StatsPage`/`ImportSummary`)
- [ ] An "Ouvertures" nav entry and the `/openings` route are added; the app-level routing test asserts the page renders on the route
- [ ] The stats are computed on the fly from `games` — no new table or precomputation is added for the aggregation
- [ ] No engine/`Mistake`/`Danger position` content (US-4), no per-move drill-down (US-5), no side×cadence matrix, no "Total" line
- [ ] `npm run seed:openings` seeds a deterministic offline fixture (PGNs with real `[ECO]`/`[ECOUrl]` headers) covering several openings across both sides and multiple cadences, at least one weak (<50%) and one strong opening, and at least one unclassified Game

### Feature Path (FP)

1. Launch the app seeded with the US-3 opening fixture (offline, `npm run seed:openings`) → navigate to « Ouvertures » from the navigation.
2. Read the table → the seeded openings appear, one row per (opening, side, cadence), each with its name · ECO code, side, cadence, game count, V/N/D tally and `Win rate`; rows are ordered by game count descending.
3. Confirm the highlight and the catch-all → the known weak opening (`Win rate` < 50%) is visibly highlighted, the strong one is not, and the unclassified Game appears under a single **Other** row.
4. Confirm internal consistency → each row's V/N/D sums to its game count; every shown `Win rate` equals `(win + 0.5·draw)/games` and lies in 0–100%.

Verify: UI first — navigate to `/openings` and read the figures. Probe the API/DB only if the UI cannot establish the figures. (The empty-history invitation and the malformed-header → "other" degradation are nominal-adjacent edges covered by lower-tier tests, not this FP.)

## Blocked by

None - can start immediately (the navigation enabler with routing is on `develop`; the `games`
table and US-6's `Win rate` primitive to extract are also on `develop`; `integration/US-3-weak-openings`
is cut from up-to-date `develop`).
