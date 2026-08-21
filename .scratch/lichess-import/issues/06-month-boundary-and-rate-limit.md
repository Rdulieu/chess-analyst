# 06 — The month boundary and the rate limit

Status: `ready-for-agent`

> **Implemented on the business-story integration branch `integration/US-12-lichess-import`.**
> Branch from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a
> green local check (build + tests + green FP, no blocking finding); `integration -> develop` stays
> human.

## Parent

`.scratch/lichess-import/PRD.md` — business story **US-12** (`BACKLOG.md`).

## What to build

Two cases where a naive implementation loses data or lies about what happened.

**The date, and why it is the start and not the end.** Lichess's export **filters on the game's
start** — verified against the live API with a game started 2020-08-27 and finished 2020-09-20: it
comes back in August's window, not September's. So a Lichess Game is dated by its start, even though
the game's end is the semantic twin of what chess.com gives us. Dating by the end would let a Game be
**fetched by one month and dated in another**, which makes the summary contradict itself and — far
worse — makes importing that month alone **miss the Game entirely**, a hole no re-import and no
deduplication would ever reveal. `Game.date` is therefore "the date the Platform files the match
under" (`CONTEXT.md`): its end on chess.com, its start on Lichess, each Platform consistent with
itself. Only correspondence games can straddle a boundary at all — 6 of 403 in the reference
account — which is exactly the population where a silent loss goes unnoticed.

**The rate limit.** A `429` from Lichess is an *instruction*, not a failure, and ADR-0010's
deliberate no-retry rule does not fit it: treating it as a month failure would cascade, month 3
failing and then 4 to 60 too, each on its own line, while we keep hammering an API that just said no.
So on a `429` — **and only on a `429`** — the adapter waits one minute and replays that month
**once**; a second `429` is an ordinary month failure and the existing tolerance takes over. The
Player must be **told the import is waiting**, or a minute of silence reads as a freeze.

Note for whoever implements this: the calibration comes from Lichess's documentation, not from
measurement — every `429` we could actually produce during grilling was the IPv6 refusal described
in slice 04, not a genuine throttle. If a real one shows up, use it to revisit the wait.

## Acceptance criteria

- [ ] A Lichess Game is dated by the game's start
- [ ] A Game's date always falls inside the month that imported it
- [ ] A correspondence game straddling a month boundary is imported exactly once, by the month
      holding its start, and importing the following month alone neither loses nor duplicates it
- [ ] A `429` causes a one-minute wait and a single replay of that month
- [ ] A second consecutive `429` on the same month becomes an ordinary month failure, and the
      remaining months are still covered
- [ ] Nothing but a `429` triggers a retry
- [ ] While the import is waiting on the Platform, the screen says so — distinctly from progress and
      from failure
- [ ] A month the Platform cannot answer carries its failure on its own line, and the import is not
      presented as globally failed
- [ ] Build and the full test suite green

### Feature Path (FP)

1. Import the month containing the **start** of a correspondence game that ended the following month
   → the game is there, dated inside the month that brought it in
2. Import the following month on its own → no game is lost and none is duplicated
3. While an import is waiting on the Platform → the screen says it is waiting, not that it failed
4. Import a range in which one month cannot be served → that month's line carries the failure, the
   other months are covered, and the import is not reported as a global failure

Verify: UI first.

## Blocked by

- `.scratch/lichess-import/issues/04-a-lichess-month-lands.md`
