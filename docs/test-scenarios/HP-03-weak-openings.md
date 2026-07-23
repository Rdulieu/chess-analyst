---
id: HP-03
covers: [Weak opening, Opening, Win rate, Import]
---

# HP-03 — Spot my weak openings

## Goal
After importing a month of their real chess.com history, the Player opens the `Weak opening` view
and sees their results grouped by `Opening`, split by the side they played and the time control
category, each with a `Win rate` — with the openings under 50% highlighted so they know where to
study. This is US-3's core value: turning the raw history into an opening-level, results-first
read.

> Run against the **real chess.com API** (not a fixture archive), on top of a real Import. The
> deterministic figures (specific ECOs, exact rates, the Other bucket) live in the sub-issue's
> fixture-based Feature Path; here, on real data, assert **shape and internal consistency**, not
> fixed numbers.

## Drive-by
- Navigation: reaching the `Weak opening` view as its own page (`/openings`) from the app's navigation.
- Opening classification from chess.com: each entry carries an ECO code and a readable name, taken from the imported Games (never recomputed locally); Games chess.com did not classify fold into a single **Other** entry.
- Whole-history aggregation: the view reflects all imported Games, computed on the fly (no per-run scope selector, no precomputed table).

## Preconditions
- App started locally with its single command, talking to the **real** chess.com API (no `CHESSCOM_BASE_URL` override).
- **Clean data state**: a fresh local database, so the breakdown reflects exactly the Games imported in this run. Reset the local database file before running.
- Reference account: the Player's username **`DudulSmash`**, month **2026/06** (immutable past month, 54 games: 48 blitz + 6 bullet, all standard chess).

## Journey
1. Import `DudulSmash` for 2026/06 (Blitz + Bullet) → the import completes with a summary.
2. Navigate to the `Weak opening` view (`/openings`) from the app's navigation → a table of openings is shown.
3. Read the table → each row is one (Opening, side, cadence) entry showing the opening name and its ECO code, the side (Blancs/Noirs), the cadence, the game count, the win/draw/loss tally and the `Win rate`; the rows are ordered by game count descending.
4. Spot the weak openings → rows with a `Win rate` under 50% are visibly highlighted for review; rows at or above 50% are not.
5. Confirm the breakdown covers the whole import → the game counts across all entries sum to the number of Games imported in step 1 (each Game contributes to exactly one entry), and any Game chess.com did not classify appears under a single **Other** entry rather than being dropped.

## Checks
### UI
- Step 2: the view is a distinct page reached via navigation; with a non-empty history a table of openings is shown (not the empty-history invitation).
- Step 3: every row shows a readable opening name **and** an ECO code, a side, a cadence, a game count, a spelled-out win/draw/loss tally, and a `Win rate`; the `Win rate` equals standard scoring `(wins + 0.5·draws)/games` and lies within 0–100%; each row's win/draw/loss parts sum to its game count; rows are in non-increasing game-count order.
- Step 4: at least the highlight rule holds — every row under 50% is highlighted and no row at/above 50% is (a 50% row, if present, is **not** highlighted; the threshold is strict). The highlight is perceivable without relying on colour alone.
- Step 5: the sum of all entries' game counts equals the imported Game count from step 1; if the account has any unclassified Game in scope, exactly one **Other** entry (per side/cadence) carries it.

### Backing store (optional)
- Each `games` row carries the chess.com ECO code and opening name resolved at import; the `/openings` aggregation groups by (eco, side, cadence) and is computed on read (no separate counter table).

## Cleanup (best-effort)
- The run imports real Games into the local database. To re-run from a clean state, reset the local database file (it is recreated empty on next launch).

## Notes
- **Real network dependency**: needs chess.com reachable; a rate-limit or outage surfaces as an import failure (502 from the relay), which is an environment finding, not an app defect.
- Use an **immutable past month** (2026/06) so the imported set — and therefore the openings — are stable across runs.
- Assert **shape and internal consistency** (fields present, parts sum, rate in range, counts sum to the import total, highlight rule, sort order), never fixed ECOs or rates — the real games drive the values.
- Real chess.com PGNs carry `[ECO]`/`[ECOUrl]` headers, so most Games classify; a small **Other** bucket (aborted/very short Games) may or may not appear depending on the month — its absence is not a failure.
