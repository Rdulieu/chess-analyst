# Global stats page — history-wide totals by cadence and side

Status: ready-for-agent
Business ref: BACKLOG.md — US-6
Decisions: reuses the `/stats` route + nav entry from the navigation enabler (ADR-0006); uses the
`Win rate` glossary term (CONTEXT.md). No new ADR (on-the-fly aggregation over a small table is
neither hard to reverse nor surprising).

## Problem Statement

The Player has imported their chess.com history but has no history-wide view of how they are
actually doing. The only results figure in the app is the **per-import** win/draw/loss tally in
`ImportSummary`, which reflects a single Import run, not the whole retained history. The `/stats`
page exists only as a reserved placeholder. The Player wants an at-a-glance summary of their
results across **all** imported Games — overall and split by the two Game-level attributes that
matter to them (time control category and the side they played).

## Solution

Fill the `/stats` page with a global summary computed on the fly over every retained Game:

- a **Total** line — games played, the win/draw/loss tally, and the `Win rate`;
- a **per-cadence** breakdown — one line per time control category (bullet, blitz, rapid, daily),
  each with games, win/draw/loss and `Win rate`;
- a **per-side** breakdown — Blancs / Noirs, each with games, win/draw/loss and `Win rate`.

When no Games are imported, the page shows an invitation message only. A cadence or side with no
Games is shown at 0 without a `Win rate` (no division by zero). This is the "how am I doing over
everything" view; per-opening and per-position analysis belong to other features (see Out of
Scope).

## User Stories

1. As the Player, I want to see the total number of Games in my imported history, so that I know how much the summary is based on.
2. As the Player, I want to see my overall win/draw/loss tally across all imported Games, so that I know my record at a glance.
3. As the Player, I want to see my overall `Win rate` (standard scoring, all cadences combined), so that I have a single headline figure.
4. As the Player, I want my results broken down per time control category, so that I can tell whether I do better in bullet, blitz, rapid or daily.
5. As the Player, I want each cadence line to show its games, win/draw/loss and `Win rate`, so that I can judge each cadence on its own.
6. As the Player, I want my results broken down by the side I played, so that I can tell whether I do better as White or Black.
7. As the Player, I want each side line to show its games, win/draw/loss and `Win rate`, so that I can judge each colour on its own.
8. As the Player, I want the exact game count shown next to every `Win rate`, so that I can judge a rate's significance myself (no minimum sample size is enforced).
9. As the Player, I want the summary to cover my **whole** imported history, not just my last Import, so that it is distinct from the per-import summary I already see.
10. As the Player, when I have imported no Games yet, I want a clear invitation to import rather than a table of zeros, so that the empty page is not confusing.
11. As the Player, I want a cadence or side I have never played to appear at 0 without a misleading `Win rate`, so that an empty bucket is not shown as 0% or 100%.
12. As the Player, I want to reach the stats from the navigation and by opening `/stats` directly, so that the view has its own address (already provided by the navigation enabler).
13. As the Player using assistive technology, I want the win/draw/loss tally spelled out (not only "W · D · L"), so that the figures are intelligible to a screen reader — consistent with the import summary.
14. As a developer, I want the stats computed on demand from the retained Games, so that the figures are always current and no extra storage or precomputation has to be kept in sync.
15. As a developer picking up US-3 later, I want the per-opening analysis kept out of this page, so that Weak opening remains the home for opening-level results.

## Implementation Decisions

- **New read endpoint `GET /api/stats`** (local API, ADR-0002), returning the whole summary in one
  response. On-the-fly aggregation over the `games` table — **no new table, no precomputation**
  (deliberately unlike `Move habit`/ADR-0005: a history-wide count/tally over a small single-user
  table is a handful of trivial `GROUP BY`s, so scanning on read is cheap and always consistent).
- **Repository function** (e.g. `getStats`) computing, against the database: the overall totals,
  the per-`time_control_category` breakdown, and the per-`player_color` breakdown — each as
  `{ games, win, draw, loss, winRate }`. `Win rate` uses standard scoring `(win + 0.5·draw)/games`
  and is **null when `games === 0`** (the caller renders no rate for an empty bucket).
- **API contract** (shape, not fixed values):

  ```
  GET /api/stats →
  {
    total:      { games, win, draw, loss, winRate },        // winRate: number | null
    byCategory: { bullet: Bucket, blitz: Bucket, rapid: Bucket, daily: Bucket },
    bySide:     { white: Bucket, black: Bucket }
  }
  // Bucket = { games, win, draw, loss, winRate }  (winRate null when games === 0)
  ```

  All four cadences and both sides are **always present** (a bucket with no Games is
  `{ games: 0, win: 0, draw: 0, loss: 0, winRate: null }`). `win/draw/loss` are Player-relative
  (the `games.result` column already is).
- **`StatsPage`** (client) fetches `/api/stats` on mount and renders: the Total line, the
  per-cadence lines, the per-side lines. When `total.games === 0` it shows an **invitation
  message only** (no table). A cadence/side bucket with `games === 0` renders its count as 0 and
  **omits the rate**. The win/draw/loss tally is spelled out for assistive tech, mirroring
  `ImportSummary`.
- **`Win rate` is computed server-side** (in the endpoint/repository), consistent with
  `GET /api/move-habits`, so the client only formats it.
- **Navigation/route unchanged**: `/stats` and its nav entry already ship from the enabler
  (ADR-0006); this US only replaces the placeholder body.
- **Server otherwise untouched**: no schema change, no change to Import.

## Testing Decisions

Good tests assert observable behaviour — what the endpoint returns and what the page renders —
not how the aggregation is written. Prefer existing seams, at the highest point.

- **Repository (`getStats`)** — against a real (`:memory:`) SQLite database: insert Games spanning
  several cadences, both sides and all three results, then assert the overall totals, the
  per-cadence and per-side buckets, the standard-scoring `Win rate`, and that an untouched
  cadence/side comes back `games: 0, winRate: null`. Prior art: `server/test/repository.test.ts`,
  `server/test/move-habits.test.ts`.
- **API (`GET /api/stats`)** — integration test with supertest against a running app + seeded
  `:memory:` database: assert the response shape and figures for a known seed, plus the empty
  database case (`total.games === 0`, buckets all zero with `winRate: null`). Prior art:
  `server/test/api.test.ts`.
- **`StatsPage` component** — render with a mocked `fetch`: assert the Total line, the per-cadence
  and per-side lines (games, spelled-out W/D/L, rate), the **empty-state invitation** when there
  are no Games, and that a 0-game bucket shows 0 **without** a rate. Prior art:
  `client/test/ExplorerPage.test.tsx`, `client/test/ImportSummary.test.tsx`.
- **App-level routing test** — the existing `/stats` assertion in `client/test/App.test.tsx`
  currently checks the placeholder ("à venir"); it is **updated** to assert the stats content
  renders on `/stats`.
- **Test pyramid apex — Feature Path (agentic, offline, deterministic)**: a subagent launches the
  app seeded with the **`Move habit` fixture** (`npm run seed:move-habits`, offline — it already
  contains Games across both sides and the blitz/bullet/rapid cadences with known results),
  navigates to `/stats` via the nav, and reads the summary. It asserts **internal consistency**
  (per-cadence games sum to the total; per-side games sum to the total; each bucket's W/D/L sums
  to its games; each `Win rate` equals `(win + 0.5·draw)/games` and lies in 0–100%) and the exact
  deterministic figures the fixture produces. This is the sub-issue → integration auto-merge gate.
- **Happy Path**: no new HP (the HP budget is 2/3: HP-01, HP-02). The global stats view is best
  covered as a **drive-by** on an existing HP run against real data (e.g. glance at `/stats` after
  the HP-01/HP-02 import and check the totals are internally consistent), rather than a third HP.

## Out of Scope

- **Opening-level analysis** (which openings are good/weak by side and cadence) — that is **US-3
  (Weak opening)**, in real ECO openings, not first moves. Explicitly rejected for `/stats` during
  grilling.
- **Per-position / per-move** habits — **US-5 (Move habit)**, already delivered on its own page.
- **Stockfish / `Evaluation` / `Mistake` / `Danger position`** — US-4.
- A **crossed cadence × side matrix** — rejected during grilling (sparse, noisy at this level);
  the two breakdowns stay independent.
- Any **precomputation or new storage** for stats, and any **filtering** (date range, last-N,
  per-month) — the view is the whole retained history, computed on the fly.
- Links out to other pages from `/stats` (e.g. to the explorer) — not included by default.

## Further Notes

- On-the-fly is the right call precisely because the aggregate is a whole-table count/tally over a
  small, single-user, local database (ADR-0002/0003); the always-current result avoids the
  idempotency/backfill concerns that `Move habit` had to carry (ADR-0005).
- The `Move habit` fixture doubles as the stats FP substrate: its six Games give a deterministic
  Total (6 games, 2 W / 1 D / 3 L), a per-side split (White 1 W/1 D/1 L, Black 1 W/2 L) and a
  per-cadence split (blitz 4, bullet 1, rapid 1, daily 0) — no separate stats fixture needed.
- Likely a single tracer-bullet issue (endpoint + repository aggregation + `StatsPage` body +
  updated routing test); `/to-issues` may confirm it stays one slice.
