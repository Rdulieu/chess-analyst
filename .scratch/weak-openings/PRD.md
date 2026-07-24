# Weak opening page — win rate per opening, by side and cadence

Status: ready-for-agent
Business ref: BACKLOG.md — US-3
Integration branch: `integration/US-3-weak-openings` (cut from up-to-date `develop`; US-3 depends
only on the routing enabler + `games` table, both on `develop` — not on US-6).
Decisions: new **ADR-0007** (store chess.com's opening classification on Games at import; aggregate
on the fly). Uses the `Opening`, `Weak opening` and `Win rate` glossary terms (CONTEXT.md). Adds
its own `/openings` route (reserved for `Weak opening` by ADR-0006). Dev-phase rules apply — schema
change + re-import backfill are acceptable (`CLAUDE.md` "Dev phase").

## Problem Statement

The Player wants to know which of their openings are dragging their results down — but the app
offers no opening-level view. `/stats` (US-6) shows totals by cadence and by side; the explorer
(US-5) shows move-by-move habits. Neither answers "as White in blitz, which of my openings do I
actually lose with?" The Player has to eyeball games one by one. They want their imported history
grouped by `Opening`, split the way it matters — the side they played and the time control
category — with a `Win rate` per group and the weak ones (under 50%) called out, so they know
where to focus study.

## Solution

A dedicated **`/openings` page** ("Ouvertures") listing every `Opening` the Player has actually
played, one row per (Opening, side, cadence) entry — the granularity the `Weak opening` glossary
term fixes ("White Sicilian in blitz" and "White Sicilian in rapid" are two entries). Each row
shows the opening name and its ECO code, the side, the cadence, the game count, the win/draw/loss
tally and the `Win rate`. Rows with a `Win rate` **under 50% are highlighted** for review. No
minimum sample size is enforced — the game count sits next to every rate so the Player judges its
significance. The table is **sorted by game count descending** (most-played, most meaningful
first), so a one-off 0% fluke does not top the list; the highlight makes weak rows stand out
wherever they land.

The `Opening` comes from **chess.com's own classification**, resolved once at import from the PGN's
`[ECO]`/`[ECOUrl]` headers and stored on the Game (ADR-0007) — the same "trust chess.com" stance
already used for the time control category. Games chess.com did not classify (aborted / too short)
fall under a single catch-all **Other** opening rather than being dropped. With no imported Games,
the page shows an invitation message only.

## User Stories

1. As the Player, I want my imported Games grouped by `Opening`, so that I can see my results opening by opening instead of game by game.
2. As the Player, I want each opening shown with its human-readable name and its ECO code, so that I recognise the opening and can look it up unambiguously.
3. As the Player, I want each opening split by the side I played (Blancs / Noirs), so that I can tell whether an opening works for me as White but not as Black.
4. As the Player, I want each opening split by time control category (bullet / blitz / rapid / daily), so that I can tell whether an opening works for me in blitz but not in rapid.
5. As the Player, I want "White Sicilian in blitz" and "White Sicilian in rapid" to be separate rows, so that side and cadence are never conflated into one misleading figure.
6. As the Player, I want each row to show its game count, its win/draw/loss tally and its `Win rate`, so that I can judge each opening entry on its own.
7. As the Player, I want rows with a `Win rate` under 50% highlighted, so that my weak openings jump out without me scanning every number.
8. As the Player, I want the exact game count next to every `Win rate`, so that I can judge a rate's significance myself — a 40% over 30 games matters more than a 0% over 1 game.
9. As the Player, I want the table sorted by game count descending by default, so that my most-played (most meaningful) openings are at the top and a single-game fluke does not lead the list.
10. As the Player, I want Games chess.com could not classify to appear under a single "Other" entry, so that they are still counted and visible rather than silently missing from the totals.
11. As the Player, I want the `Win rate` to use the same standard scoring `(wins + 0.5·draws)/games` as everywhere else in the app, so that the figure is consistent with `/stats` and the explorer.
12. As the Player, I want to reach the page from the navigation ("Ouvertures") and by opening `/openings` directly, so that the view has its own address.
13. As the Player, when I have imported no Games yet, I want a clear invitation to import rather than an empty table, so that the page is not confusing before I have data.
14. As the Player using assistive technology, I want the win/draw/loss tally spelled out (not only "V · N · D"), so that the figures are intelligible to a screen reader — consistent with `/stats` and the import summary.
15. As a developer, I want each Game's opening resolved once at import and stored on the Game, so that the page is a cheap group-by and the classification is queryable rather than re-parsed on every read.
16. As a developer, I want the opening classification taken from chess.com's headers, not recomputed locally, so that what the Player sees matches chess.com and no ECO dataset is bundled.
17. As a developer, I want the `Win rate` primitive shared with `/stats` rather than duplicated, so that the canonical metric has one implementation across features.
18. As a developer picking up US-4 later, I want engine-based analysis (`Mistake`, `Danger position`) kept out of this page, so that `Weak opening` stays a pure results-statistics view.

## Implementation Decisions

- **Schema change on `games` (ADR-0007).** Add `eco` (text, the ECO code — the `Opening` identity) and
  `openingName` (text, human-readable). Both populated at import. Games chess.com did not classify
  are stored with `eco = "other"` and an `openingName` of "Autre / non classée" (sentinel, never
  `null` — keeps `GROUP BY` totals honest). Dev-phase rules: no migration/backfill machinery is
  owed; existing local rows get the columns by re-importing.
- **Opening extraction is a pure function** (`parseOpening(pgn)` or similar) called inside the
  import mapping (`toGame`): reads the `[ECO]` header for the code and derives the name from the
  `[ECOUrl]` slug (last path segment, dashes → spaces); returns the `"other"` sentinel when no
  `[ECO]` header is present. No I/O, isolated so it can be unit-tested on its own — the densest,
  most edge-case-prone part. Mirrors the existing `normalizeResult`/`toGame` split.
- **`Win rate` primitive extracted to a neutral shared module.** The `Bucket` type
  (`{ games, win, draw, loss, winRate }`) and its computation (`(win + 0.5·draw)/games`, `null`
  when `games === 0`) move out of US-6's stats repository into a module both features depend on, so
  the dependency graph points at a shared domain kernel, not a US-3 → US-6 edge (ADR-0007). US-6's
  stats repository is re-pointed at it; its behaviour is unchanged. Each feature composes its own
  row shape around the primitive rather than widening a shared type.
- **New read endpoint `GET /api/openings`** (local API, ADR-0002). On-the-fly aggregation over
  `games`: `GROUP BY eco, player_color, time_control_category`, each group carrying the opening
  name, the side, the cadence and a `Bucket`. **No new table, no precomputation** (unlike
  `Move habit`/ADR-0005 — no PGN rescan needed here). Returns the entries **sorted by game count
  descending**. `win/draw/loss` are Player-relative (the `games.result` column already is).
- **API contract** (shape, not fixed values):

  ```
  GET /api/openings →
  {
    openings: [
      { eco, openingName, side, cadence, games, win, draw, loss, winRate }
      // side: "white" | "black"; cadence: "bullet" | "blitz" | "rapid" | "daily"
      // winRate: number (always present — an entry only exists if games >= 1)
      // sorted by games desc
    ]
  }
  ```

  Only entries with `games >= 1` are returned (no zero-filled cross-product): every row has a
  `Win rate`. An empty history returns `{ openings: [] }`.
- **`OpeningsPage`** (client, new) fetches `/api/openings` on mount and renders a flat table:
  columns Ouverture (name · ECO) · Côté · Cadence · Parties · V/N/D · Win rate. Rows with
  `winRate < 0.5` are highlighted. When `openings` is empty it shows an **invitation message only**
  (no table). The win/draw/loss tally is spelled out for assistive tech, mirroring `StatsPage` /
  `ImportSummary`. No "Total" line (that belongs to `/stats`).
- **Navigation + route.** Add a `/openings` route and an "Ouvertures" nav entry alongside Mes
  parties / Explorateur / Stats (route reserved for `Weak opening` by ADR-0006).
- **FP fixture (new).** A dedicated seed (`npm run seed:openings`) of short Games whose PGNs carry
  real `[ECO]`/`[ECOUrl]` headers, spanning several openings across both sides and multiple
  cadences, with at least one opening below 50% and one at/above, plus at least one unclassified
  (no `[ECO]`) Game feeding the **Other** entry. Reuses the same standalone opening-extraction and
  insertion path as the real import (one logic, two entry points — cf. ADR-0005 fixture pattern).

## Testing Decisions

Good tests assert observable behaviour — what `parseOpening` returns, what the endpoint returns,
what the page renders — not how the aggregation is written. Prefer existing seams, at the highest
point.

- **`parseOpening` (pure)** — unit test: a PGN with `[ECO "B22"]` + `[ECOUrl ".../Sicilian-Defense-Alapin-Variation"]`
  yields `{ eco: "B22", openingName: "Sicilian Defense: Alapin Variation" }`; a PGN with no `[ECO]`
  header yields the `"other"` sentinel; malformed/partial headers degrade to `"other"` rather than
  throwing. Prior art: `server/test/mapping.test.ts`.
- **Win-rate primitive** — behaviour unchanged after extraction; the existing stats tests
  (`server/test/stats.test.ts`) keep passing against the new module location. No new test surface
  beyond confirming the move is behaviour-preserving.
- **`getWeakOpenings` (repository)** — against a real (`:memory:`) SQLite database: insert Games
  spanning several openings, both sides, several cadences and all three results, then assert one
  row per (eco, side, cadence) actually played, the standard-scoring `Win rate`, the game count,
  the sort order (games desc), and that unclassified Games aggregate under `eco = "other"`. Prior
  art: `server/test/repository.test.ts`, `server/test/stats.test.ts`.
- **`GET /api/openings` (API)** — integration test with supertest against a running app + seeded
  `:memory:` database: assert the response shape and figures for a known seed, the sort order, and
  the empty-database case (`{ openings: [] }`). Prior art: `server/test/api.test.ts`.
- **`OpeningsPage` (component)** — render with a mocked `fetch`: assert the rows (name, ECO, side,
  cadence, spelled-out V/N/D, rate), the **<50% highlight**, the **empty-state invitation** when
  there are no openings, and the game-count-descending order. Prior art:
  `client/test/StatsPage.test.tsx`, `client/test/ExplorerPage.test.tsx`.
- **App-level routing test** — add a `/openings` assertion in `client/test/App.test.tsx` (nav entry
  present, page content renders on the route).
- **Test pyramid apex — Feature Path (agentic, offline, deterministic)**: a subagent launches the
  app seeded with the **new US-3 opening fixture** (`npm run seed:openings`, offline), navigates to
  `/openings` via the nav, and reads the table. It asserts the deterministic figures the fixture
  produces (specific openings appear with the expected side/cadence/games/W-D-L/rate), that the
  known weak opening (<50%) is **highlighted** and the strong one is not, that the unclassified Game
  shows under **Other**, and internal consistency (each row's W/D/L sums to its games; each shown
  `Win rate` equals `(win + 0.5·draw)/games` and lies in 0–100%; rows ordered by games desc). This
  is the sub-issue → integration auto-merge gate.
- **Happy Path**: no new HP (budget 2/3: HP-01, HP-02). Weak-opening is best covered as a
  **drive-by** on an existing HP run against real data (glance at `/openings` after the HP-01
  import and check a known opening's figures are internally consistent), not a third HP — to be
  proposed at the `integration → develop` MR, not owed by this US.

## Out of Scope

- **Engine analysis** — `Mistake`, `Danger position`, `Evaluation`, Stockfish (US-4). This page is
  pure results statistics; no evaluation of *why* an opening is weak.
- **Per-move / per-position** drill-down inside an opening — that is the `Move habit` explorer
  (US-5), already delivered on `/explorer`. `/openings` stops at the (Opening, side, cadence) row.
- **Computing ECO ourselves** from the moves / bundling an ECO dataset — rejected in ADR-0007; we
  trust chess.com's classification.
- **A crossed side × cadence matrix per opening**, or any pivot beyond the flat (Opening, side,
  cadence) rows — kept flat, consistent with US-6's independent breakdowns.
- **Filtering / date ranges / minimum sample size** — the view is the whole retained history; no
  minimum sample is enforced (glossary), the game count carries the significance judgement.
- **Study recommendations / links to lessons / opponent-specific breakdowns** — not part of the
  results view.
- **Backfill machinery** for Games imported before this feature — re-import instead (dev-phase
  rule).

## Further Notes

- The two-treatment split is deliberate (ADR-0007): the *classification* is precomputed (resolved
  once at import, from an external source we must not re-derive), the *aggregation* is on the fly
  (a cheap group-by over a small local table). This is why there is a schema change but no counter
  table — the opposite balance from `Move habit`/ADR-0005, for a documented reason.
- chess.com's `[ECOUrl]` is often finer than the `[ECO]` code (several named lines per code). We
  key on the **code** per the glossary; the stored `openingName` is for display. If the same code
  appears under differing names across Games, display the most frequent — a rare, cosmetic edge.
- Likely a **single tracer-bullet issue** (schema + import extraction + primitive extraction +
  repository + endpoint + page + routing test + fixture); `/to-issues` may confirm it stays one
  slice or peel the primitive-extraction refactor into a tiny preparatory issue.
- The `BACKLOG.md` US-3 line should be moved to "Doing" and annotated with this PRD path and the
  integration branch when `/to-issues` runs (mirroring US-5/US-6).
