# 04 — A Lichess month lands

Status: `done` — merged into `integration/US-12-lichess-import` (build + tests + FP 4/4 verts, 2026-08-21)

> **Implemented on the business-story integration branch `integration/US-12-lichess-import`.**
> Branch from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a
> green local check (build + tests + green FP, no blocking finding); `integration -> develop` stays
> human.

## Parent

`.scratch/lichess-import/PRD.md` — business story **US-12** (`BACKLOG.md`).

## What to build

Importing under a Lichess Profile, on the nominal path. The Player does exactly what they already
do — pick a month range, pick the paces, watch the months fill in, read the summary — and it works.

The Lichess adapter implements the month fetch of the port:

- The games export is asked for **ndjson**, with the PGN and the opening included, and the response
  is read **line by line**: a multi-object body is not parseable as a single JSON document.
- **A month becomes `since`/`until` epoch milliseconds at UTC month boundaries** — the month is our
  unit, not the Platform's (ADR-0016). Lichess could stream a whole range in one request; we
  deliberately do not, because the month is what makes progress countable and a failure local.
- **Months are never fetched in parallel.** Already true for memory reasons (ADR-0010); it is now
  also what keeps us inside Lichess's "one request at a time" rule.
- The translation into our vocabulary: pace (`ultraBullet` folds into `bullet`), the Player's side
  and result (no winner means a draw; a winner equal to the Player's colour is a win), the opening
  from the structured field rather than the PGN, the canonical URL from the game id, and the date.
  The game's status is not stored, as today for chess.com.
- The **opponent's name is nested** under each side's user, unlike chess.com's flat field.

**Pin the address family to IPv4.** This is the single most expensive thing in this PRD to
rediscover: the export endpoint answers an **instant, permanent `429`** over IPv6 from at least one
real network, while answering `200` over IPv4 in the same second. Node's `fetch` does Happy Eyeballs
and may pick IPv6. Every symptom mimics a rate limit, so the wrong fixes — wait longer, retry, add a
token — all look obviously right. There is **no token** in this feature.

The adapter's base URL is configurable by environment, mirroring the chess.com adapter, so tests and
the Feature Path point at a fixture instead of the live API.

Out of this slice on purpose: the exclusions (05) and the month-boundary and rate-limit cases (06).

## Acceptance criteria

- [ ] A range import under a Lichess Profile brings in that range's standard games, mapped to the
      Player-relative Game shape
- [ ] Each imported Game carries opponent, the Player's side, the Player-relative result, its date,
      its category, its opening code and name, and a canonical Lichess URL
- [ ] `ultraBullet` games are stored as `bullet`
- [ ] Progress is counted in months while the import runs, and the summary carries one line per month
- [ ] A month the Player did not play in is reported at zero, not as a failure
- [ ] Re-importing an overlapping range imports nothing already present and reports it as already
      present
- [ ] The month range is converted at UTC boundaries
- [ ] Months are fetched strictly one at a time
- [ ] Lichess requests pin the address family to IPv4
- [ ] The adapter's base URL is configurable by environment
- [ ] No API token is used or stored anywhere
- [ ] An imported Lichess Game can be analyzed and replayed like a chess.com one
- [ ] Build and the full test suite green

### Feature Path (FP)

1. Under the Lichess Profile, import a populated month → the games appear in the game list with
   opponent, side, result, category and opening
2. Import the same month again → everything is reported as already present, and no game is duplicated
3. Import a range that includes a month with no play → that month's line reads zero, and it is not
   presented as a failure
4. Open one of the imported games → it replays on the board and can be analyzed, exactly as a
   chess.com game

Verify: UI first.

## Blocked by

- `.scratch/lichess-import/issues/01-platform-is-a-value.md`
- `.scratch/lichess-import/issues/02-five-time-control-categories.md`
- `.scratch/lichess-import/issues/03-a-lichess-profile-exists.md`
