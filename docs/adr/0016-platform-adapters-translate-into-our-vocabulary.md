# The domain owns its vocabulary; a Platform adapter translates into it

Date: 2026-08-21 — US-12 (import from Lichess as well as chess.com)

## Context

Until now "the external source" and "chess.com" were the same thing, and the import module said so
in its types: `fetchMonth` answered `ChessComGame[]`, and `import/mapping.ts` translated that shape
into a `Game`. ADR-0002 already made the local relay the only thing that talks to a chess site, but
it said nothing about *how many* sites there could be.

US-11 anticipated a second one — `profiles.platform` exists, carrying `chesscom` alone — and US-12
adds Lichess. Lichess is not a re-skin of chess.com: it streams ndjson instead of returning a JSON
array, it takes `since`/`until` in epoch milliseconds instead of monthly archives, it names paces
`ultraBullet`/`classical`/`correspondence`, and it answers its own opening classification. Every one
of those differences is a place where an external vocabulary could leak into ours.

## Decision

**Our vocabulary is ours. A `Platform` adapter's job is to translate into it, and the translation is
the adapter's alone.**

Four consequences, each a decision in its own right:

1. **The port speaks the domain.** `PlatformClient` (under `server/src/platforms/`) exposes
   `fetchPlayer(username)` and `fetchMonth(username, year, month)`, and `fetchMonth` answers
   `{ totalFetched, games }` where `games` carry the **neutral** `ImportedGame` shape (canonical URL,
   PGN, opponent, the Player's side and result, date, `Time control category`, `eco`/`openingName`).
   No caller ever sees a chess.com or Lichess payload shape.
2. **The month is our unit, not a Platform's.** The port is asked for one calendar month (UTC).
   chess.com happens to serve exactly that; the Lichess adapter converts the month to
   `since`/`until` milliseconds. We therefore make N sequential requests to a Platform that could
   have streamed the whole range in one — deliberately, because the month is what makes progress
   countable and a failure **local** (ADR-0010), and a single stream that dies at month 40 is an
   Import entirely in failure.
3. **`Time control category` has five values, and the mapping is not one-to-one.** `bullet`,
   `blitz`, `rapid`, `classical`, `correspondence`. `ultraBullet` folds into `bullet`;
   chess.com's `daily` **is renamed** `correspondence`, the game's own word for the same concept;
   `classical` gets its own value because folding it anywhere would merge incomparable paces. See
   `CONTEXT.md`.
4. **Sequential months are a rate-limit guarantee, not just a memory choice.** Lichess's own hard
   rule is "only make one request at a time" (`lichess-api.yaml:45`); its anonymous limit for the
   games export is a **throughput throttle** (20 games/second,
   `api-games-user-username.yaml:10`), not a request quota — so a long range costs *time*, never
   headroom, and the risk of a 429 does not grow with the number of months. ADR-0010 already forbade
   parallel months for memory and rate-limit reasons; from now on that ban is **load-bearing for
   correctness against Lichess**, and parallelising the month loop is not an optimisation anyone may
   make later without revisiting this ADR.
5. **A 429 is an instruction, not a failure.** ADR-0010's deliberate no-retry rule stands for a
   month that could not be fetched, but "the Platform asks you to wait" is a different answer, and
   treating it as a failure would cascade: month 3 fails, then so do months 4 to 60, each on its own
   line, while we keep hammering an API that just said no. So on a 429 — and **only** on a 429 — the
   adapter waits **one full minute** (the figure Lichess documents, `lichess-api.yaml:48`; there is
   no `Retry-After` header to read) and replays that month **once**. A second 429 is an ordinary
   month failure and the existing tolerance takes over. The Player must be **told** the Import is
   waiting, rather than left in front of a screen that looks frozen for a minute.
6. **The client is resolved per Profile.** A single injected client becomes a registry
   `Record<Platform, PlatformClient>`; the import job and the profile-creation route pick by
   `profile.platform`, because the Platform is a property of the `Profile` (ADR-0014) and never a
   parameter the Player chooses.

## Considered options

- **(A) Switch on the payload shape inside `import/mapping.ts`** — cheapest today. Rejected: the
  switch does not stay in one place. The variant filter (`rules !== "chess"`), the result-code
  normalisation, the opening extraction and the pace naming are all chess.com-isms currently
  wearing import-logic clothing; each would need its own branch, and `import/` would depend on every
  Platform's wire format forever.
- **(B) Keep the port at the wire level and add a second translation layer above it** — a port
  answering raw payloads plus a per-Platform mapper chosen by the caller. Rejected as (A) with more
  files: the caller still has to know which shape it is holding.
- **(C) The port answers the domain shape; each adapter owns its own translation (chosen)** — the
  adapter is the only place a Platform's vocabulary exists. `import/` keeps what is genuinely ours:
  the month loop, fault tolerance, the Player's category choice, deduplication by URL, persistence,
  `recordMoveHabits`.
- **(D) A generic "chess platform" abstraction with capability flags** (does it stream? does it
  classify openings?) — rejected as speculative generality for two Platforms, and it would push the
  differences back up into the caller as conditionals.

## What the field measurement changed (2026-08-21)

The rate-limit reasoning above was written from the documentation and then **tested against the live
API**, which corrected it on two points worth recording, because both look like a rate-limit problem
and neither is one:

- **A 429 on the export endpoint was not a rate limit at all — it was the IP family.** From this
  machine, `https://lichess.org/api/games/user/{username}` answers `429 {"error":"Please only run
  1 request(s) at a time"}` **instantly and indefinitely over IPv6**, and `200` over IPv4, in the
  same second. It is insensitive to waiting (probed at 1, 4, 8 and ~20 minutes), independent of the
  account queried, and specific to that endpoint (`/api/user/{username}` answers fine over IPv6).
  The first attempts even answered `404 Not found` for an account with tens of thousands of games.
  **Consequence for the code:** Node's `fetch` does Happy Eyeballs and may pick IPv6, so the Lichess
  adapter must **pin the address family to IPv4** (`autoSelectFamily: false`, or an agent with
  `family: 4`). Without that pin, a perfectly correct import fails with an error message that
  invites exactly the wrong fix — waiting longer, retrying, or adding a token, none of which help.
- **Decision 5's one-minute wait is therefore untested.** Every 429 we could actually produce was
  the IPv6 refusal, not a genuine throttle. The retry stands as written — it is cheap and the
  cascade it prevents is real — but its calibration comes from Lichess's documentation, not from
  measurement, and the first genuine 429 we see should be used to revisit it.
- **The throughput figure, on the other hand, checks out**: 403 games streamed in 16.7 s ≈ 24
  games/s against a documented anonymous limit of 20/s. The "no token" decision holds for the
  reason originally given.

## Consequences

- **A refactoring slice with nothing visible to show.** `mapping.ts`, `opening.ts` and
  `normalizeResult` move into the chess.com adapter; `chesscom.ts` becomes
  `platforms/chesscom/`. Its Feature Path is "chess.com import still behaves exactly as before" —
  the value is entirely in what the *next* slice does not have to fight.
- **Two migrations are owed** (CLAUDE.md, ADR-0015 — nothing rebuilds `Evaluation`s):
  `games.time_control_category` values `daily` → `correspondence`, and `move_habits`'s `daily`
  column renamed plus a new `classical` column. The new column's `NOT NULL DEFAULT 0` is honest
  without a backfill: every existing row comes from chess.com, which never produced a `classical`
  game.
- **`platform` becomes a real value.** `$type<"chesscom">` widens to `"chesscom" | "lichess"`, and
  the three places that hardcode the word chess.com on screen
  (`CurrentProfileBanner.tsx:24`, `ProfilesPage.tsx:120`, the import screen) must name the
  Profile's actual Platform — a Player must never be able to wonder which site they are fetching from.
- **Error messages stop naming chess.com.** `routes/profiles.ts` answers "chess.com est
  injoignable" and "Compte chess.com introuvable"; both become the Platform's own name. The
  distinction those messages exist to make — "does not exist" vs "could not ask" — is unchanged and
  still load-bearing.
- **The `Opening` authority moves with it** — see the US-12 amendment to ADR-0007: the classification
  is the *Platform's*, never recomputed, and the `Profile` partition is what keeps two Platforms'
  classifications from ever meeting in one figure.
- **`Game.date` is per-Platform by design, and that is a correctness requirement.** Lichess's
  `since`/`until` filter on `createdAt` (verified against the live API: a game started 2020-08-27 and
  finished 2020-09-20 is returned by the August window, not September's). So the Lichess adapter
  dates a Game by `createdAt`, not by `lastMoveAt` — even though `lastMoveAt` is the semantic twin of
  chess.com's `end_time`. Dating by the end would let a Game be **fetched by one month and dated in
  another**, which makes the summary contradict itself and — far worse — makes importing that month
  alone miss the Game entirely, a hole no re-import or deduplication would ever reveal. Only
  correspondence games can straddle a boundary (6 of 403 in the reference account), which is exactly
  the population where a silent loss would go unnoticed.
- **Games against the computer are out of scope.** Lichess answers them (`players.{white,black}`
  carrying `{aiLevel}` instead of a `user`) and chess.com never does. Beyond the mapping problem —
  there is no account name to record as the opponent — importing them from one Platform only would
  make two Profiles incomparable. Same principle as aborted games, opposite outcome: the corpus must
  be **the same kind of thing** on both Platforms. See `CONTEXT.md`, `Time control category`.
- **No token, and no secret to store.** The export is served anonymously; an OAuth token would only
  raise the throughput (30 games/s, or 60 for one's own games) — roughly 3 minutes down to 1 or 2 for
  a 60-month, 3600-game history. It buys speed, not headroom, and it would put a secret in a local
  single-user tool (ADR-0002) for a manual operation nobody watches. Adding one later is additive:
  an `Authorization` header in one adapter, and nothing in the port changes.
- **Adding a third Platform is now one directory**, with no edit to `import/`. That is the test this
  ADR is meant to pass.
