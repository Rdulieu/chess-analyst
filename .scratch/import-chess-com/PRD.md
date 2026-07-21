# Import chess.com game history (scoped, incremental)

Status: ready-for-agent
Business ref: BACKLOG.md — US-2

## Problem Statement

The app currently only ever shows one hardcoded fixture Game (Morphy's Opera Game). The Player
can't see their own chess.com history — the whole reason the tool exists (find Weak openings and
Danger positions in *my* games) is blocked until real Games are in the database. There is no way
to tell the app who the Player is, and no way to pull their Games in from chess.com.

## Solution

From the Player's perspective: the app opens empty and invites them to import. The Player enters
their chess.com username once (remembered across sessions), picks a **single month** and the
**time control categories** they care about (any subset of bullet, blitz, rapid, daily), and
clicks **Import**. The app — through a small local relay (ADR-0002), never the browser directly —
fetches that month's games from chess.com's public API, keeps only the categories asked for,
skips any Game already retained (so re-importing is safe and adds no duplicate), and persists the
new ones as they arrive. A progress bar tracks the run. When it finishes, a **summary** window
reports what happened: total games fetched, breakdown per cadence, how many were newly imported
vs already present, and the Player's win/draw/loss tally. The imported Games then appear in the
app, navigable on the existing interactive board (US-1). The fixture Game is gone from startup —
the Player only ever sees their real history.

## User Stories

1. As the Player, I want to enter my chess.com username once and have it remembered, so that I don't retype it on every import.
2. As the Player, I want to change my stored username later, so that I can fix a typo or point the tool at a different account.
3. As the Player, I want to pick a specific month and year to import, so that I control which slice of my history I pull in.
4. As the Player, I want to choose which time control categories (bullet, blitz, rapid, daily) to import, so that I can focus on the formats I care about.
5. As the Player, I want to trigger the import manually with a button, so that the app never calls chess.com without my say-so.
6. As the Player, I want a progress bar while the import runs, so that I can see it is working and roughly how far along it is.
7. As the Player, I want a summary when the import finishes — total fetched, breakdown per cadence, newly imported vs already present, and my win/draw/loss tally — so that I understand exactly what was retained.
8. As the Player, I want re-importing a month I already imported to add nothing duplicate, so that my history stays clean.
9. As the Player, I want an interrupted import (network drop, rate limit) to keep what it already retained and let me resume by simply re-running, so that I never lose progress or start from scratch.
10. As the Player, I want a clear error when my username is unknown, with nothing written to my history, so that I can correct the typo.
11. As the Player, I want a month with no games — or none in my chosen categories — to report "0 games imported" as a normal outcome, not an error.
12. As the Player, I want each imported Game to record which side I played (White or Black) and my result (win, loss, or draw), so that later features can analyse my openings by side and my results.
13. As the Player, I want the app to start empty (no fixture game) and invite me to import, so that I only ever see my real history.
14. As the Player, I want my imported Games to appear in the app after the import, so that I can open and navigate them on the board (reusing US-1).
15. As the Player, I want the whole import to run on my own machine through the local relay, so that my data never transits a cloud service (ADR-0002).
16. As the Player, I want the app to reach chess.com only through the local relay, so that the browser's CORS restrictions never block the import.
17. As the Player, I want the time control category to come straight from chess.com's own `time_class`, so that categories match chess.com exactly with no reinterpretation.
18. As the Player, I want Games identified by their chess.com game URL, so that the same Game is never stored twice across imports.
19. As the Player, I want only standard-chess games imported (variants like Chess960 skipped), so that later opening and engine analysis isn't polluted by games that don't fit standard analysis.
20. As a developer, I want the chess.com client to be an injectable seam faked in tests, so that import logic can be tested without hitting the network.
21. As a developer, I want the chess.com base URL to be configurable, so that the deterministic Feature Path and lower-tier tests can run against a canned archive instead of the live API.

## Implementation Decisions

### Domain / schema

- **`Player`** (new glossary term): the single owner of the history, identified by a chess.com username entered once and retained. Persisted in a new **`settings`** table (a single stored username is enough — no multi-user concern per ADR-0002). Exposed/updated through the relay.
- **`games` schema migration** (Drizzle, ADR-0003), extending the US-1 table:
  - `game_url` — `TEXT NOT NULL UNIQUE`. The chess.com game URL; the **dedup key** for incremental import ("already retained" ⇔ this URL is already present).
  - `player_color` — `TEXT NOT NULL`, `white` | `black`. The side the Player played, derived at import by matching the username against the game's white/black usernames.
  - `result` — now the **Player-relative** result, `win` | `loss` | `draw` (US-1 stored the raw PGN result string; there is no real data to preserve since the fixture leaves startup).
  - `opponent`, `date`, `time_control_category`, `pgn` keep their US-1 meaning. `date` derives from chess.com's `end_time` (epoch seconds).
- **Fixture removed from startup**: `seedFixtureIfEmpty` is dropped from the launch path; an empty database is now the normal first-run state. The Morphy Game data survives **only as a test fixture** (given a synthetic `game_url`, `player_color`, `result` to satisfy the new schema).

### chess.com client (new seam)

- A dedicated module is the **only** place that talks to chess.com. Single-month import calls
  `GET {baseUrl}/pub/player/{username}/games/{YYYY}/{MM}` → `{ "games": [...] }`.
- **Base URL is configurable** (constructor arg / env), defaulting to `https://api.chess.com`. This is what lets tests and the deterministic FP point at a canned archive.
- **Username validation vs empty month**: chess.com returns `404` both for an unknown username and for a month with no archive, and `200 {"games":[]}` for an existing player who played nothing. To tell them apart, the relay first checks player existence via `GET {baseUrl}/pub/player/{username}` (`404` ⇒ unknown-username error); a `404`/empty month archive after that is the normal "0 games" outcome. (Source: chess.com Published-Data API — confirm live during implementation.)
- **Per-game mapping** from chess.com's shape:
  - `time_class` → `time_control_category` (1:1: bullet/blitz/rapid/daily).
  - `player_color` = whichever of `white.username` / `black.username` matches the Player's username (case-insensitive).
  - `result` = read the Player's side result code: `win` → `win`; a draw code (`agreed`, `stalemate`, `repetition`, `insufficient`, `50move`, `timevsinsufficient`) → `draw`; anything else (`checkmated`, `resigned`, `timeout`, …) → `loss`.
  - `opponent` = the other side's `username`; `date` from `end_time`; `pgn`, `url` verbatim.
  - Games with `rules !== "chess"` are skipped (story 19).

### Import service (core logic seam)

- `import(username, year, month, categories)` orchestrates: fetch month → filter by chosen categories and standard-chess → for each game, skip if `game_url` already present, else map + persist. Returns a **summary**: `{ totalFetched, byCategory: {bullet,blitz,rapid,daily}, imported, alreadyPresent, results: {win,draw,loss} }`.
- **Incremental, at-the-water persistence** (US-2 "persistance incrémentale"): each new Game is committed as it is processed, not in one all-or-nothing transaction. An interrupted run keeps what it retained; re-running resumes for free via the `game_url` dedup.

### Relay API (highest seam below the UI)

- `GET /api/settings` / `PUT /api/settings` — read/update the stored chess.com username.
- `POST /api/import` — body `{ year, month, categories }`; runs the import and returns the summary. Uses the stored username.
- **Progress** streamed via **SSE** (`text/event-stream`): the relay emits progress events (games persisted / total for the month) so the UI can drive the progress bar; the terminal event carries the summary. The summary payload is the tested contract; the fine-grained progress stream is validated at the agentic layer.
- Existing `GET /api/games` / `GET /api/games/:id` (US-1) are unchanged in shape aside from the new Game fields, so the board keeps working.

### Frontend

- **Empty state**: when `GET /api/games` returns none, App shows an invitation to import rather than an error (US-1 currently shows "No game available yet").
- **Import form**: chess.com username field (prefilled from settings), month/year selector, time-control category multi-select, Import button.
- **Progress bar** bound to the SSE stream.
- **Summary window** (post-import, not a preview): total fetched, per-cadence breakdown, imported vs already-present, win/draw/loss tally.
- **Game list**: imported Games become selectable; opening one reuses the US-1 board and navigation. (US-1's App renders a single game; it grows to list the imported Games.)
- `client/src/api.ts` gains `importGames(params)`, `getSettings()`, `saveSettings()` alongside the existing `fetchGames`/`fetchGame`.

## Testing Decisions

Tests assert observable behaviour — what the relay returns, what's persisted, what the summary reports, what the UI shows — never internals of Drizzle, Express, cm-chess, or the SSE plumbing.

- **chess.com client**: tested against the **faked base URL** serving canned archive JSON (a small real chess.com response captured as a fixture). Assert it parses games and surfaces the 404/empty distinction. No live network in the suite.
- **Import service** (the core): faked chess.com client + in-memory SQLite (prior art: `server/test/repository.test.ts`). Assert: category filtering, standard-chess-only filtering, `game_url` dedup (re-import adds nothing), correct `player_color`/`result` normalisation from both sides, the summary figures (imported/alreadyPresent/byCategory/results), and that a mid-run failure leaves already-persisted Games in place (resumability).
- **Relay API**: supertest against a running app with the faked client injected + in-memory DB (prior art: `server/test/api.test.ts`). Assert `GET/PUT /api/settings` round-trip, `POST /api/import` returns the summary, unknown username → error + nothing written, empty month → 0-games summary (not an error).
- **`client/src/api.ts`**: fetch mocked (prior art: `client/test/api.test.ts`) for `importGames`/`getSettings`/`saveSettings`.
- **UI components**: mount the import form and summary; assert the empty-state invitation, that submitting drives an import call, and that the summary renders total/per-cadence/imported-vs-present/W-D-L. Prior art: `client/test/App.test.tsx`, `client/test/Board.test.tsx`.

### Agentic layer (apex)

- **Feature Path (per sub-issue, auto-merge gate)**: deterministic and network-free — the app is launched with the chess.com **base URL pointed at a canned archive**; the subagent drives the real UI (enter username, pick month + categories, Import), then confirms the progress bar runs and the summary shows coherent figures, and that the imported Games appear and open on the board. This is what keeps the per-slice gate fast (the live API is far too slow for a per-commit gate).
- **Happy Path (run once, human decision at `integration → develop`)**: the definitive validation is a **real import from the Player's own chess.com account** against the live API — slow and network-dependent, so run sparingly (effectively once), not per slice. The Player's real username is entered at run time, never committed. This is the HP candidate for US-2 (US-1 had none, being infrastructural); it exercises the true chess.com contract end to end. At most 3 HP overall — this is the first.

## Out of Scope

- Any statistics computation — **Weak opening** (US-3) and **Danger position** / engine analysis (US-4). US-2 only imports, stores, and displays Games; it captures `player_color` and normalised `result` so those features can build on it, but computes nothing.
- Multi-month / date-range / bulk "import everything" flows — deliberately one month at a time to start and stay testable (grilling decision). Later expansion is easy given the URL dedup.
- Auto-import on launch, background sync, scheduling.
- Chess variants (Chess960 etc.) — skipped on import.
- Any cloud/hosting — ruled out by ADR-0002.
- Editing or deleting imported Games.

## Further Notes

- No new ADR: the local-relay-to-chess.com decision is already ADR-0002; the URL dedup key, single-month scope, at-the-water persistence and SSE progress are either unsurprising or reversible implementation choices, none meeting the (irreversible + surprising + real trade-off) bar.
- Glossary already updated during grilling: **Player** added; **Game** sharpened (Player's side + Player-relative result, identified by chess.com URL); **Import** sharpened (manual, single month + chosen categories, incremental within scope). See `CONTEXT.md`.
- The `date`/`end_time` conversion and the exact chess.com draw/loss result codes should be confirmed against the live API during implementation (Source: chess.com Published-Data API, https://www.chess.com/news/view/published-data-api).
