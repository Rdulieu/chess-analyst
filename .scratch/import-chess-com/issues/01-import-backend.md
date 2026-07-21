# 01 — Import backend (validated without UI)

Status: ready-for-agent
Business ref: BACKLOG.md — US-2

**Integration branch.** Implemented on the business-story integration branch
`integration/US-2-import-chess-com`: branch a `feature/*` from it and merge back **into it** (this
sub-issue auto-merges on a green local check — build + tests + green FP, no blocking finding), NOT
into `develop`. The `integration -> develop` merge stays a human decision.

## Parent

`.scratch/import-chess-com/PRD.md` (US-2).

## What to build

The complete import backend, with **no UI**. Through the local relay (ADR-0002), the app fetches
one month of a Player's games from chess.com's public API, keeps only the chosen time control
categories and standard-chess games, skips any Game already retained (dedup by chess.com game
URL), and persists the new ones — each mapped to the `Game` glossary shape from the Player's point
of view. This is the irreducible end-to-end path (schema → chess.com client → import service →
relay endpoint), validated by driving the running relay directly.

- **Schema migration** (Drizzle): extend `games` with `game_url` (`TEXT NOT NULL UNIQUE`, the
  chess.com game URL — the dedup key), `player_color` (`white` | `black`), and change `result` to
  the Player-relative `win` | `loss` | `draw`. Drop the fixture from startup (`seedFixtureIfEmpty`
  no longer runs on launch; empty DB is the normal first-run state). The Morphy Game survives only
  as a test fixture, given a synthetic `game_url`/`player_color`/`result`.
- **chess.com client** (the only module talking to chess.com): `GET {baseUrl}/pub/player/{username}/games/{YYYY}/{MM}`.
  **Base URL configurable** (default `https://api.chess.com`) so tests/FP run against a canned
  archive. Player existence checked via `GET {baseUrl}/pub/player/{username}` to tell unknown
  username (404 there) from an empty month.
- **Import service**: `(username, year, month, categories)` → fetch → filter by categories and
  `rules === "chess"` → for each game skip if `game_url` present else map + persist **as it goes**
  (no all-or-nothing transaction; an interrupted run keeps what it retained, re-run resumes via
  dedup). Mapping: `time_class` → `time_control_category`; `player_color` by matching username
  (case-insensitive) to white/black; `result` = `win`→win, draw code (`agreed`, `stalemate`,
  `repetition`, `insufficient`, `50move`, `timevsinsufficient`)→draw, else→loss; `opponent` = other
  side's username; `date` from `end_time`; `pgn`, `url` verbatim.
- **Relay**: `POST /api/import` (body `{ year, month, categories, username }` — username in the
  body for now; persistence of it is issue 05) returning a result count. `GET /api/games` /
  `GET /api/games/:id` keep working with the new Game fields.

## Acceptance criteria

- [ ] A migration adds `game_url` (unique), `player_color`, and the normalised `result`; schema comes up automatically on launch.
- [ ] The fixture no longer seeds on startup; a fresh DB starts with zero Games.
- [ ] The chess.com client's base URL is configurable and defaults to the live API.
- [ ] `POST /api/import` fetches the given month, keeps only the chosen categories and standard-chess games, and persists new Games mapped to the Game shape.
- [ ] `player_color` and `result` are correct from the Player's side, for a Game the Player won, lost, and drew, and whether the Player was White or Black.
- [ ] Re-running the same import persists no duplicate (dedup by `game_url`).
- [ ] An unknown username yields an error response and writes nothing.
- [ ] A month with no matching games returns a 0-games result (not an error).
- [ ] An import interrupted partway leaves the already-persisted Games in place; re-running completes the rest with no duplicates.
- [ ] Variant games (`rules !== "chess"`) are skipped.

### Feature Path (FP)

API-level (no UI exists yet — the running "app" is the relay; the subagent drives it over HTTP and
inspects `GET /api/games`). The relay is launched with its chess.com base URL pointed at a canned
archive.

1. Import a month with a chosen set of categories → the response confirms N games imported, and listing the Games returns exactly those, each carrying a chess.com URL, the side the Player played, and a win/loss/draw result.
2. Import that same month again → the listing gains no duplicate Game.
3. Import for an unknown username → an error is reported and no Game is stored.
4. Import a month with no matching games → a 0-games result is reported, not an error.

Verify: no UI yet, so drive the relay endpoints directly and inspect the returned/stored Games.

## Blocked by

None - can start immediately.
