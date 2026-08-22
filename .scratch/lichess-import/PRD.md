# PRD — Lichess import

Business story: **US-12** — *Importer mes parties depuis un compte Lichess, pas seulement chess.com.*
Integration branch: `integration/US-12-lichess-import`. Grilling output: `CONTEXT.md` (`Platform`,
`Time control category`, `Game`, `Monthly import`, `Import`), **ADR-0016** (Platform adapters
translate into our vocabulary), amendment to **ADR-0007** (the Platform is the classification
authority).

Status: `ready-for-agent`

## Problem Statement

The tool can only study a history it can reach, and it can only reach chess.com. A player whose
games are on Lichess gets nothing from it — not a degraded view, nothing at all: they cannot even
create a `Profile`, because profile creation validates the account against chess.com and Lichess
accounts are not there.

That is not a niche gap. Lichess is where a large share of amateur play happens, and it is where a
whole pace of play lives that chess.com barely has: `classical`. A player who studies their slow
games has nowhere to go.

Worse, the limitation is **invisible in the code's shape rather than in its vocabulary**. US-11 wrote
`profiles.platform` into the schema and `CONTEXT.md` already says a `Profile` is "one account on one
platform" — so the app *claims* to be platform-aware while every import path, every error message
and every screen label says "chess.com" in plain text. The gap between what the domain says and what
the code does is exactly the kind that produces confident wrong answers later.

## Solution

A `Profile` can be created on **Lichess** as well as chess.com, and importing under it works the
same way it always has: pick a month range, pick the paces, watch the months fill in, read the
summary. Nothing about the journey changes — only the site behind it.

The Platform is a property of the `Profile`, chosen once at creation, never a parameter of an
import. There is no "source" dropdown anywhere. But because a Player must never wonder which site
they are about to fetch from, the Platform is **named on screen**: in the current-profile banner, in
the profile list, and on the import screen itself.

Underneath, the app stops treating "the external source" and "chess.com" as the same thing. A
`PlatformClient` port answers in **our** vocabulary, and each Platform's adapter owns the
translation into it — including the places where the two sites genuinely disagree, which the
`Profile` partition keeps from ever meeting in one figure.

One user-visible enrichment falls out of it: `Time control category` gains **`classical`**, and
chess.com's `daily` is renamed **`correspondence`** — the game's own word for the same thing.

## User Stories

1. As a Lichess player, I want to create a `Profile` for my Lichess account, so that the tool can
   study a history it currently cannot reach at all.
2. As a Player creating a Profile, I want to choose the `Platform` explicitly, so that the account
   name I type is looked up on the right site.
3. As a Player creating a Profile, I want the account validated against the Platform I chose, so
   that a typo fails immediately instead of producing an empty Profile.
4. As a Player creating a Profile, I want "this account does not exist" to read differently from
   "I could not reach the site", so that I know whether the mistake is mine.
5. As a Player creating a Profile, I want the error message to name the Platform I actually chose,
   so that it never tells me chess.com is unreachable when I asked for Lichess.
6. As a Player creating a Lichess Profile, I want a closed account treated as non-existent, so that
   I get an actionable answer rather than a Profile that will never hold a Game.
7. As a Player, I want my Lichess account stored with the casing Lichess itself uses, so that the
   name on screen is the name I recognise.
8. As a Player, I want the same account name on two Platforms to give me two separate Profiles, so
   that two different people's histories are never blended.
9. As a Player, I want the current-profile banner to name the Platform, so that I always know which
   site the figures on screen come from.
10. As a Player, I want the profile list to name each Profile's Platform, so that I can tell two
    same-named Profiles apart before selecting one.
11. As a Player, I want the import screen to name the Platform it will fetch from, so that I am
    never one click away from importing from the wrong site.
12. As a Player, I want to import a month range from Lichess exactly as I do from chess.com, so
    that I do not have to learn a second way of doing the same thing.
13. As a Player, I want progress counted in months during a Lichess import, so that a long import
    shows me how far it has got.
14. As a Player, I want one line per month in the summary, so that I can see which months were
    covered.
15. As a Player, I want a month I simply did not play in reported at zero, so that a gap in my
    history is distinguishable from a gap in the fetching.
16. As a Player, I want a month Lichess could not answer for to carry its own failure, so that one
    bad month does not present my whole import as failed.
17. As a Player, I want to replay the same range safely after a partial import, so that recovery is
    one action and not a reconstruction.
18. As a Player, I want games already imported to be recognised and not duplicated, so that an
    overlapping range costs me nothing.
19. As a Player, I want my Lichess games to carry the opening Lichess itself assigns them, so that
    the classification matches what I see on the site I play on.
20. As a Player, I want a Lichess game too short to classify to fall into the `Other` bucket, so
    that the openings total stays honest.
21. As a Player, I want my `classical` games to have their own category, so that a 60-minute game is
    never averaged with a 10-minute one.
22. As a Player, I want my `ultraBullet` games counted as bullet, so that they are studied rather
    than dropped.
23. As a Player, I want the pace I know as chess.com's `daily` to be called `correspondence`, so
    that one word covers the same thing on both sites.
24. As an existing chess.com Player, I want my already-imported games and their analysis preserved
    across the rename, so that I do not lose engine work that nothing can rebuild.
25. As a Player, I want to choose `classical` and `correspondence` among the paces to import, so
    that I can scope an import to the play I care about.
26. As a Player, I want the per-pace breakdown on `/stats`, `/openings` and the explorer to include
    the new categories, so that the figures add up to what I imported.
27. As a Player, I want variant games (chess960, atomic, …) left out of the import, so that my
    aggregates describe the game I am trying to improve at.
28. As a Player, I want games started from an arbitrary position left out, so that FEN- and
    ECO-keyed aggregates keep meaning what they claim.
29. As a Player, I want games against the computer left out, so that engine sparring does not
    pollute the record of how I play against people.
30. As a Player, I want an aborted game imported rather than dropped, so that the corpus is the same
    kind of thing on both Platforms.
31. As a Player with correspondence games, I want a game to be dated inside the month that imported
    it, so that importing a month cannot silently miss a game whose date falls in it.
32. As a Player, I want each Game to link back to its game on Lichess, so that I can open the
    original.
33. As a Player, I want to switch between a chess.com Profile and a Lichess Profile and see every
    figure change with it, so that the partition I was promised is real.
34. As a Player, I want a Lichess import to be told when it is waiting on Lichess rather than
    frozen, so that a pause does not look like a bug.
35. As a Player, I want a long Lichess import not to be refused for going too fast, so that
    rebuilding a whole history is a thing I can actually do.
36. As a Player, I want to analyze and review Lichess games exactly as chess.com ones, so that the
    engine, the board and the danger positions all work the same.
37. As a maintainer, I want adding a third Platform to be one directory and no edit to the import
    module, so that this work is paid once.
38. As a maintainer, I want no API token or secret introduced, so that a local single-user tool stays
    one.

## Implementation Decisions

### The port speaks the domain (ADR-0016)

- A **`PlatformClient`** port replaces `ChessComClient`, exposing `fetchPlayer(username)` and
  `fetchMonth(username, year, month)`. Both answer **our** shapes; no caller ever sees a
  chess.com or Lichess payload.
- `fetchMonth` answers `{ totalFetched, games }`. `totalFetched` keeps its current meaning —
  everything the Platform returned, variants and out-of-scope games included — so the summary's
  headline figure does not change definition. `games` carry a neutral `ImportedGame` shape:
  canonical URL, PGN, opponent, the Player's side, the Player-relative result, date,
  `Time control category`, `eco`/`openingName`.
- **What moves into the chess.com adapter**: the chess.com → Game translation, the PGN-header
  opening parse, the side-result normalisation, the variant filter. These are chess.com-isms
  currently wearing import-logic clothing.
- **What stays in the import module**: the month loop, per-month fault tolerance, the Player's
  category filtering (a choice, not a Platform fact), deduplication by URL, persistence,
  move-habit precomputation.
- Wiring becomes a **registry** `Record<Platform, PlatformClient>`. The import job and the
  profile-creation route resolve the client from `profile.platform`.

### The Lichess adapter

- Account lookup: the user endpoint; a 404 means "does not exist", any other error means
  "could not ask", and a **`disabled` account is treated as non-existent**. Canonical casing comes
  from the response's username field directly (unlike chess.com, where it is read off a URL).
- Games: the user games export, asked for **ndjson**, with the PGN and the opening included. The
  response is read **line by line** (a multi-object body is not parseable as one JSON document) and
  resolved as the month's array.
- A month becomes `since`/`until` epoch milliseconds at **UTC** month boundaries.
- **The address family must be pinned to IPv4.** The export endpoint answers an instant, permanent
  `429` over IPv6 from at least one real network while answering `200` over IPv4. Node's `fetch`
  does Happy Eyeballs and may pick IPv6. Without the pin, a correct import fails with a message that
  invites the wrong fix. This is not an optimisation; it is a correctness requirement, and it is the
  single most expensive thing to rediscover in this PRD.
- **429 handling**: wait one minute, replay that month **once**; a second 429 is an ordinary month
  failure and the existing tolerance takes over. The Player must be told the import is waiting.
- **No token.** The export is served anonymously; a token would only raise throughput. Adding one
  later is an `Authorization` header in one adapter, with no change to the port.
- **Months are never fetched in parallel.** Already true for memory reasons (ADR-0010); now also
  load-bearing against Lichess's "one request at a time" rule.
- Base URL configurable by environment, mirroring the chess.com adapter, so tests and the Feature
  Path point at a fixture.

### The translation table

| Lichess | Ours |
| --- | --- |
| `speed: ultraBullet` | `bullet` (folded) |
| `speed: bullet` / `blitz` / `rapid` / `classical` | same, `classical` being new |
| `speed: correspondence` | `correspondence` |
| `variant` other than standard, or a game from an arbitrary position | **out of scope**, never a Game |
| a side carrying an AI level instead of an account | **out of scope**, never a Game |
| no winner | `draw` |
| a winner equal to the Player's colour | `win`, else `loss` |
| game status | **not stored** (as today for chess.com) |
| the game id | canonical URL `https://lichess.org/{id}` |
| `createdAt` | the Game's date |
| the opening object | `eco` / `openingName`, absent → the `other` sentinel |

`createdAt` and not the last-move instant, because the export filters on `createdAt`: dating by the
end would let a Game be fetched by one month and dated in another, so importing that month alone
would **silently miss it**. Only correspondence games can straddle a boundary at all — which is
precisely the population where the loss would go unnoticed.

### Schema and migrations

Two migrations are owed (CLAUDE.md, ADR-0015 — nothing rebuilds `Evaluation`s). Both must be
non-destructive, re-runnable, and fail loudly rather than half-assign rows.

- `profiles.platform` widens from a single-value type to `chesscom | lichess`. No data change.
- `games.time_control_category`: every `daily` value becomes `correspondence`.
- `move_habits`: the `daily` counter column is renamed `correspondence`, and a **new `classical`
  column** is added `NOT NULL DEFAULT 0`. The default is *honest* without a backfill: every existing
  row comes from chess.com, which never produced a `classical` game.

### Screens

- The three places that hardcode "chess.com" — the current-profile banner, the profile list, and the
  import screen — name the Profile's actual Platform.
- Profile creation gains a Platform choice.
- Error messages stop naming chess.com; the "does not exist" vs "could not ask" distinction is
  unchanged and still load-bearing.
- Category checkboxes and every per-pace breakdown (`/stats`, `/openings`, the explorer) carry five
  categories.
- An import waiting on a rate limit says so.

### Not extended

The `settings` table (a remembered chess.com username) has been made redundant by the `Profile` and
is **not** extended to Lichess. Its removal is flagged debt, out of this PRD's scope.

## Testing Decisions

A good test here states an **externally observable** fact and would survive a rewrite of how it is
produced: "an ultraBullet game is counted as bullet", not "the mapper calls the fold helper". The
richest trap in this feature is asserting on payload shapes — those are precisely what the port
exists to hide.

Seams, highest first, all but one already in place:

1. **The `PlatformClient` port** (existing, injected into the app factory). Everything above it —
   month loop, fault tolerance, dedup, job, routes — keeps testing against a fake client. The
   existing import, range and job test suites change only in the type they fake. **This is the seam
   the whole refactoring exists to preserve**: a port answering a union of external shapes would
   force all three suites to know both Platforms.
2. **Each adapter's pure translation** (existing, prior art in the mapping and opening tests). One
   translation per Platform, tested as a pure function: pace folding, the three exclusions, the
   result derivation, the date choice, the `other` sentinel.
3. **The real HTTP client against a local stand-in** (existing, prior art in the chess.com client
   test, which spins a tiny express fake and drives the real fetch client). A Lichess mirror serves
   **ndjson** and covers: month → `since`/`until` in UTC, line-by-line reading, 404 vs error, the
   429 retry, canonical casing, a disabled account. **New seam, same height**: a configurable base
   URL for the Lichess adapter.
4. **The migrations** (existing, prior art in the profiles-migration test): re-runnable, preserves
   existing rows and their evaluations, `classical` starts at zero, no row left half-assigned.
5. **The API in supertest** (existing): a `lichess` Profile imports through the Lichess client, a
   `chesscom` Profile through the chess.com one, and the error messages name the right Platform.
6. **Client components** (existing tests for the banner, the profile list and the import form): the
   Platform is named; five categories are offered.

Pyramid placement: this feature is **bottom-heavy on purpose**. The translation table is a dense
pile of edge cases and belongs in fast pure tests; the journey it serves is one we already have.

Apex — agentic:

- **Per-slice Feature Paths**, on fixture ndjson via the configurable base URL, are the auto-merge
  gate. They carry what needs a precise case rather than a journey: the pace folding, the three
  exclusions, the 429 wait, the date straddling a month boundary, the disabled account.
- **Path 0 gains a Lichess reference profile**, imported against the **real** API. Reference
  account: **`Metalyst`** — 403 games, 20 populated months across a 71-month span, including 38
  `classical` and 64 `correspondence`, so both new translations are exercised for real, and the
  empty months exercise the "gap in history vs gap in fetching" distinction. Path 0 is already
  outside the three-HP cap.
- **No fourth HP.** The journey does not change — import, then find your weak openings — only the
  site behind it. Instead **HP-01 gains one step**: switch to the Lichess Profile and check that the
  banner names the site and the figures change. That step tests something nothing tested before,
  since both reference profiles were chess.com until now.
- Known coverage limit, stated rather than glossed: `Metalyst` has **no ultraBullet game and no
  aborted game**, so those two rules stay fixture-only and never meet the real API.

## Out of Scope

- **Any third Platform.** ADR-0016 is meant to make the next one cheap, not to add it.
- **An API token**, and with it any secret storage. Additive later.
- **Consolidating one person's accounts across Platforms.** Two accounts are two Profiles, full
  stop; a grouping *above* Profiles would be a different story entirely.
- **Comparing figures between Platforms.** Openings, dates and paces are per-Platform by design and
  the `Profile` partition keeps them apart. Nothing in this PRD makes cross-Platform comparison
  meaningful, and nothing should present it as if it were.
- **Removing the `settings` table**, flagged debt.
- **Recomputing openings locally** to make the two Platforms agree — rejected twice now (ADR-0007
  and its amendment).
- **Intra-month progress.** Lichess announces no total, so a counter would climb without a bound and
  say less than the month bar already does.
- **Changing the range or category UI**, beyond the five categories and the Platform's name.
- **Importing games against the computer or in a variant**, on either Platform.

## Further Notes

Three things this PRD knows because they were **measured against the live API**, not assumed. Each
one contradicted a documented or plausible expectation, so re-deriving them from first principles
will produce the wrong answer:

- The export endpoint **refuses IPv6** (instant `429`, insensitive to waiting, independent of the
  account, endpoint-specific) and answers `200` over IPv4. Every symptom mimics a rate limit, which
  makes the wrong fixes — wait longer, retry, add a token — look obviously right.
- `since`/`until` filter on the game's **start**, verified with a game started 2020-08-27 and
  finished 2020-09-20: it is returned by August's window, not September's.
- Anonymous throughput measured at ~24 games/s against a documented 20/s, which is what makes "no
  token" a decision about speed rather than access.

A fourth, smaller: a Lichess user's per-pace counters describe **rated** play and include puzzles.
They are not an inventory of games, and the adapter must never use them to decide what to import.

The first slice is a refactoring with nothing visible to show, and its Feature Path is "chess.com
import behaves exactly as before". That is uncomfortable to ship and worth stating plainly: its
value is entirely in what the following slices do not have to fight.
