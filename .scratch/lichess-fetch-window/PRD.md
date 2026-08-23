# PRD — A Lichess import that does not pay a request per empty month

Business story: **US-17** — *Importer un historique Lichess sans payer une requête par mois vide.*
Integration branch: `integration/US-17-lichess-fetch-window`. Grilling output:
`.scratch/lichess-fetch-window/GRILL-NOTES.md` (D1→D8), `CONTEXT.md` (`Monthly import` amended),
**ADR-0018** (renumbered from 0016; decisions 1, 2, 4 and 5 revised, field-measurement section
corrected).

Status: `ready-for-agent`

## Problem Statement

A Player whose history lives on Lichess waits minutes for an import that has almost nothing to fetch.

Importing `Metalyst`'s full history covers **71 months, of which 51 are empty** — 72 % of the
requests return zero games. The reference import took ~3.5 minutes, of which **~2.4 minutes was pure
waiting**: six one-minute pauses, each a `429` earned by the burst of 71 sequential requests. The
Player sees a progress bar creeping through months that were never going to hold anything.

And empty months are the norm on Lichess, not the exception: `Monado_Boy` is 86 games spread over
~80 months. The sparser the account, the worse the ratio — the tool is slowest exactly where it has
least to do.

The cause is not a setting. chess.com serves **monthly archives**, so asking it month by month is
asking it in its own shape. Lichess serves a **`since`/`until` stream** and can answer the whole
range in one request. We plaqued chess.com's shape onto an API that does not need it, and the Player
pays the difference in minutes.

## Solution

**Ask each Platform for a range, in the shape that Platform actually serves.** Lichess answers the
whole span in one streamed request; chess.com keeps looping its months, unchanged, inside its own
adapter.

Nothing the Player sees is taken away. The per-month lines stay — how many Games each month brought
in, how many were already retained, and whether it could be covered at all — because **the month is
the unit of reporting, not of fetching** (`CONTEXT.md`). Where a Platform answers a whole range at
once, "which months were covered" is read off the Games as they arrive in date order.

What the Player gains: an import of a sparse Lichess history that costs one request and no pauses,
and — when something does go wrong mid-stream — a message that says exactly where it stopped and
what to retype to cover the rest.

## User Stories

1. As a Player importing a long Lichess history, I want the import to cost one request instead of one
   per month, so that I stop waiting minutes for months that hold nothing.
2. As a Player importing a sparse Lichess account, I want empty months to cost nothing, so that the
   tool is not slowest exactly where it has least to fetch.
3. As a Player, I want my import to stop being interrupted by one-minute pauses, so that a routine
   import does not look frozen.
4. As a Player, I want to still see one line per month after the import, so that I can tell which
   months brought Games in and which brought none.
5. As a Player, I want a month I was simply inactive in to read as a plain zero, so that it stays
   distinguishable from a month that could not be fetched.
6. As a Player, I want a month that could not be covered to say so **in words**, so that I do not
   depend on a colour to notice it.
7. As a Player whose import is interrupted mid-stream, I want the Games already fetched to be kept,
   so that I do not have to start over.
8. As a Player whose import is interrupted, I want to be told **where it stopped**, so that I know
   how much of my history is actually in.
9. As a Player whose import is interrupted, I want to be told **the exact range left to cover**, in
   the same `YYYY-MM` form the import field takes, so that I can retype it without working it out.
10. As a Player whose import is interrupted, I want to be told my fetched Games were kept, so that I
    do not assume the whole import was lost.
11. As a Player re-running an interrupted import, I want already-imported Games to be recognised
    rather than duplicated, so that re-running is safe and cheap.
12. As a Player, I want the month the stream broke in to be treated as **not covered**, so that I am
    never told a partially-fetched month is complete.
13. As a Player, I want an interrupted import to still show me its summary rather than an error page,
    so that I can see what got in and what did not on one screen.
14. As a Player importing from chess.com, I want the import to behave exactly as it did before, so
    that a change made for Lichess costs me nothing.
15. As a Player, I want the import to tell me when the Platform asks us to wait, so that a pause is
    never indistinguishable from a freeze.
16. As a Player, I want that waiting message to name what is being retried, so that it does not
    announce a month when a whole range is resuming.
17. As a Player with a very large Lichess history, I want the import to report progress continuously
    rather than only at the end, so that a big import never looks stalled.
18. As a Player with a very large Lichess history, I want the import not to hold my whole history in
    memory at once, so that its size is not a limit.
19. As a Player, I want the totals in my summary to keep meaning "what the Platform had", out-of-scope
    games included, so that a month mostly full of variants does not read as empty.
20. As a Player, I want my chosen time control categories to still be honoured, so that a faster
    import does not quietly widen what it keeps.
21. As a Player, I want an import to still be filed under the Profile it was run from, so that speed
    does not weaken the partition between my accounts.
22. As a maintainer, I want the port to speak a range rather than a month, so that the next Platform
    is asked in its own shape instead of chess.com's.
23. As a maintainer, I want chess.com's month loop to live inside the chess.com adapter, so that it
    describes chess.com instead of constraining every Platform.
24. As a maintainer, I want the port to stream, so that a partial import stays partial rather than
    being lost with the exception that ended it.
25. As a maintainer, I want a truncated stream to be **detected**, so that an incomplete import can
    never be reported as a successful one.
26. As a maintainer, I want the `429` retry kept for the pre-first-byte case, so that a throttled IP
    still gets its one chance to recover.
27. As a maintainer, I want no retry after the first byte, so that the standing no-retry rule
    (ADR-0010) is applied rather than excepted.
28. As a maintainer, I want the IPv4 pin's comment to state what is actually known, so that the next
    `429` is not diagnosed against a false explanation.
29. As a maintainer, I want `path 0` to assert one request instead of 71, so that the suite can tell
    this story shipped from it not having shipped.
30. As a maintainer, I want `path 0`'s duration measured and compared to the reference, so that
    US-18 starts from a figure instead of a deduction.
31. As a maintainer, I want the reference span kept at 71 months, so that the assertion the empty
    months carry survives the speed-up.

## Implementation Decisions

### The port speaks a range, and it streams

`PlatformClient.fetchMonth(username, year, month): Promise<MonthFetch>` becomes a range-shaped,
streaming method: given a username and the range bounds, it **yields** neutral `ImportedGame`s as
they arrive, in date order.

- **chess.com's adapter absorbs the month loop.** Same requests, same order, same count, no schema
  change. Its Feature Path is "the chess.com import behaves exactly as before".
- **Lichess's adapter makes one request** for the whole range and relays its ndjson.
- The neutral `ImportedGame` shape is untouched. What changes is the *unit asked for*, never the
  vocabulary answered in (ADR-0018 decision 1).
- Rejected: keeping `fetchMonth` and buffering inside the Lichess adapter — month-by-month calls
  never reveal the requested range, so the adapter would have to guess how far to buffer.
- Rejected: adding a range method *beside* `fetchMonth` — the port would carry two ways to say the
  same thing and the service a permanent branch.

### Streaming is what keeps a partial import partial

`readNdjson` is **already** an `AsyncGenerator`; `fetchMonth` is what breaks the stream by
materialising it into an array. Returning a generator stops breaking something that already flowed.

The import service already inserts **game by game**, deduped by URL, so whatever was yielded before a
break is persisted. Were the port to return an array, a stream dying at month 40 would take months
1–39 with the exception.

`totalFetched` must survive the change: it counts what the Platform **had**, out-of-scope games
included, so a month mostly out of scope never reads as empty. A generator that only yields in-scope
Games loses that count. Two options, decided at implementation: yield a richer item carrying
`inScope`, or return the total as the generator's return value. The first is simpler to consume.

### Month coverage is derived from the Games, not from the requests

The export is requested `sort=dateAsc`, so months arrive in order.

- Every month **before** the last Game received is covered.
- **The last month received is declared NOT covered** and is included in the range to re-run. A
  stream dying mid-March leaves March partial; re-fetching a half-imported month is free (dedup by
  URL) while announcing it covered is a silent, permanent hole. We over-declare incompleteness,
  never completeness.
- Months after the stop carry their existing per-month `failure`.

### An interrupted import reports, it does not throw

The Import returns its summary — a failed month has never aborted an Import — with:

- the per-month `failure` lines for everything from the stop point on, rendered in words and with a
  non-chromatic cue, as today;
- a **global statement** in the summary's existing `message` field, in the import form's own
  `YYYY-MM` vocabulary so the range can be retyped as-is:

  > « Le flux s'est interrompu après **2020-03**. Les parties récupérées sont **conservées**. Pour
  > couvrir le reste, relancez un import de **2020-04** à **2023-08**. »

  Three facts, none decorative: where it stopped, that nothing is lost, and the exact range.

### A truncated stream must be distinguishable from a completed one

**The highest-risk unknown in this story.** If a dropped connection makes `for await` simply *end*
rather than raise, the app would import 40 months of 71 and **report success**, with 31 months shown
as plain zeros — the exact "gap in the fetching disguised as a gap in the history" the per-month
lines exist to prevent.

This is established first, in red, before anything else is built: the Lichess stand-in writes half
the ndjson and destroys the socket. If the client does not surface that as an error, the slice adds
what detects it (Lichess serves chunked; a premature end must be raised) — the story does not
proceed on the assumption that it does.

### Retry splits along the first byte

- **Before it** — a `429` on the response still earns one wait-and-replay (ADR-0018 decision 5).
  Kept, though nearly dead code: the cascade it prevented no longer exists, but a freshly-throttled
  IP still can. Its message must name the **range**; today it says "reprise du mois", which would
  misname what resumes.
- **After it** — a stream breaking mid-flight is **not retried**, applying ADR-0010's standing
  no-retry rule rather than excepting it. Recovery is the Player re-running, which dedup makes safe
  and cheap.
- Rejected: resuming at `since` = the last Game's date. It looks like recovery, reopens the door to
  bursts, and implies a completeness we cannot guarantee.

### No bound on the range

Slicing into yearly requests would rebuild the very burst this story removes — and with it the
per-IP throttle and the one-minute pauses — to buy a sign of life that streaming already gives. A
bound can be added later if a genuinely massive account justifies it.

### The IPv4 pin is kept and demoted

`request.ts` announces a "correctness requirement" and ADR-0018 concluded Lichess refuses IPv6 on the
export endpoint. **Both are false**: on 2026-08-22 the exact opposite reproduced (IPv4 → `429`,
IPv6 → `200`, two accounts, seconds apart) after the previous day's reference import had burned the
pinned IPv4. The explanation covering both is a **per-IP throttle on the export endpoint**, keyed to
a recent burst.

The pin stays — `node:http` is wanted anyway for the stream, and the pin does no harm — but becomes a
**determinism choice**: one variable fewer when diagnosing a `429`. Corrected in the same slice:
`request.ts`'s comment, `path-0-bootstrap.md`'s precondition, and PR #52's body, which all repeat the
IPv6 claim. One request is not a burst, so this story largely dissolves the question.

### No schema change, no migration

Nothing here touches the database. Games are persisted exactly as before; only how they are fetched
and how coverage is accounted change. ADR-0015's migration obligation is not triggered.

## Testing Decisions

A good test here asserts what the Player or the caller observes — which requests were made, which
Games landed, what the summary says — never how the adapter is wired internally. The port change is
precisely the kind of refactor that should leave behaviour-level tests standing: the chess.com tests
must pass **untouched**, and that is itself the assertion.

Seams, highest first. All exist; one evolves.

1. **`path 0` (agentic, real Lichess).** The suite's only live Lichess contract. Asserts **one
   request instead of 71**, the 51 zero lines still produced, and **measures the run's duration
   against the reference** so the gain is a figure. Without the request-count observation nothing in
   the suite distinguishes this story shipped from not shipped.
2. **`api.test.ts` + `fakeRegistry`.** The import route end to end: the global message and the
   per-month lines exactly as the screen consumes them.
3. **`import-range.test.ts` / `import.test.ts` + `fakeClient`.** Where the accounting lives:
   slicing one stream into months, 51 zero lines from a single stream, the last received month
   declared not covered, and partial persistence when the source raises mid-yield. **`fakeClient` is
   the one seam that changes** — it returns `{ totalFetched, games }` today and must produce a
   generator; it gains the ability to yield N Games and then throw, which is what makes the break
   testable at all.
4. **`lichess-client.test.ts` + the express stand-in.** It already runs a real server and records
   every export call in `exportCalls`, so "one request for the whole range" is asserted against the
   **real HTTP client**, not a mock. Also carries the truncated-stream test (write half, destroy the
   socket) and the pre-first-byte `429` retry.
5. **`chesscom-client.test.ts`.** chess.com issues exactly the same requests as before.
6. **`lichess-mapping.test.ts`.** The month window becomes a range window; the pure translation is
   unchanged.
7. **`ImportSummary` (client).** The global message renders, and failed months keep their word-based
   cue alongside the tint — a failed month must never be distinguishable by colour alone.

**Pyramid placement.** The behaviour is mostly server-side accounting, so the weight sits at seams
3 and 4. Each slice from `/to-issues` carries its own executable **Feature Path** as its auto-merge
gate. **No new HP**: the cap of three is held, HP-01 already covers importing, and what this story
changes — an external contract and a reporting derivation — is validated by the slice FPs and by
`path 0`.

**Order.** The truncated-stream detection (seam 4) is written **first, in red**. Everything else
rests on a break being detectable; building the accounting on top of an undetected truncation would
produce a story that reports success while losing data.

## Out of Scope

- **Any change to chess.com's behaviour.** Its adapter absorbs the month loop; requests, order and
  count stay identical.
- **Shortening the reference span.** Settled at grilling (D1): `Metalyst` stays at 71 months and the
  `README.md` rule is not reopened — this story removes the cost without removing the assertion.
- **The rest of US-18.** Instrumenting the suite, the ~12 minutes of HP-02 and HP-03, and the
  snapshot-cache arbitration belong to its own grilling. This story hands it one measured figure.
- **A bound on the range**, and resuming a broken stream where it stopped.
- **Any schema change or migration.**
- **A third Platform.** The port becoming range-shaped makes the next one cheaper; it does not add
  one.
- **Sweeping the remaining `ADR-0016` references.** Already done during grilling — all 60 were
  disambiguated when the platform ADR was renumbered to 0018.

## Further Notes

**A blind spot, recorded rather than compensated.** After this story nothing exercises "one month
fails mid-range" on the Lichess side, because there are no longer isolated months to fail. That path
stays covered on chess.com, which keeps its loop, and by the import service's unit tests. Stated here
so it is a known consequence rather than a later discovery.

**Why the domain survived this intact.** `CONTEXT.md` already defined `Monthly import` as "the unit
the Player is shown progress and outcome by" — a reporting unit by its own words. A single clause tied
it to fetching, and that clause is all this story removes. Failure locality is not lost either: it
moves from the month to the stream's stopping point, which is **finer**, not coarser.

**ADR-0018 decision 2 was factually wrong about this codebase**, and the correction is worth
remembering as a pattern. It justified monthly fetching with "a single stream that dies at month 40 is
an Import entirely in failure" — but the import already inserted game by game, so months 1–39 would
have been kept. A decision defended by a consequence the code does not have is a decision worth
re-reading.
