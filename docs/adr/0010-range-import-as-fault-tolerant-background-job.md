# A range Import runs as a background job, tolerant of a failed month

US-9 widens an `Import` from a single month to a **contiguous range of months** (CONTEXT.md). That
turns the app's cheapest write path into a potentially minutes-long one: one chess.com archive call
per month, sequentially, each followed by PGN mapping and `Move habit` precompute per Game. A
190-month history rebuild is an explicitly supported use — the range is **not capped** (a solo,
local, single-user tool has no infra cost to protect, and a cap would block the very case that
motivates US-9).

So `POST /api/import` **no longer returns the outcome**. It validates, starts a background job and
returns **202** with the initial status; the client polls `GET /api/import/status` for determinate
`done`/`total` progress **counted in months**, exactly as `POST /api/analyze` +
`GET /api/analyze/status` do for the engine pass (`createAnalysisJob`, ADR-0008). The job is
single-flighted the same way. There is **one Import contract**, not two: a single month is a range
whose bounds are equal, so `importMonth` keeps its job (fetch, map, dedupe, persist one month) and a
new `importRange` orchestrates it — it iterates, it does not reimplement.

This is a deliberate reversal of a scoping remark in ADR-0008, which contrasted the minutes-long
analysis pass with the *"network-bound Import"* and kept them apart. That contrast held while an
Import was one archive call. It no longer does. The two passes stay **separate operations** (an
Import still never triggers an analysis); they now merely share a transport shape.

**Failure policy.** The two failure modes are treated differently, because only one of them is
partial:

- An **unknown username** is checked **once, up front** (`playerExists`), before any job starts:
  `POST` fails synchronously with **404** and nothing runs. Re-checking it per month would be
  noise — the answer cannot differ between months.
- An **upstream failure on one month** (chess.com unreachable, 5xx, 429) **does not abort the
  Import**. The month is marked failed on its own `Monthly import` line, the remaining months are
  still covered, and the job ends `running: false` with **no global failure state** — the per-month
  lines carry the verdict. A mostly-successful Import is not a failed Import.

**Recovery is a re-run, not a retry.** Games are deduped by chess.com game URL, so replaying the
same range imports exactly the months that are missing and nothing else. We therefore ship **no
backoff and no retry loop**: the idempotence we already have is a stronger, simpler recovery story
than a resilience policy written against a failure mode we have never observed on this API.

## Considered options

- **Keep the Import synchronous.** No new machinery, one response carrying the summary. Rejected:
  on a dozen months the Player gets an indeterminate spinner over a multi-minute request, the
  browser may time out, and a failure on the ninth month forces a choice between discarding the
  eight successful ones and reporting an outcome the response cannot describe. Determinate
  per-month progress is the only thing that makes a long range bearable, and a synchronous response
  cannot express it.
- **Stream progress over SSE.** Finer progress without polling, but it introduces a **third**
  transport pattern into an app that already has request/response and job+poll — new failure modes,
  new tests, no gain the existing pattern does not already deliver at month granularity. Rejected.
- **Fetch the months in parallel.** Faster in principle, but the real bottleneck is the synchronous
  per-Game mapping and `Move habit` precompute, not the network: parallel fetches would only pile
  responses in memory while the insert loop catches up. It also multiplies the 429 risk, which would
  force back in the retry machinery we just argued away, and makes progress non-monotonic. Rejected.
- **Cap the range (12 or 24 months).** Protects against a typo (`2004` for `2024`) hammering a
  public API, but at the cost of forbidding the whole-history rebuild US-9 exists to enable.
  Rejected as a **server** rule; the typo risk is caught where it happens — the UI asks for
  confirmation beyond 24 months, and the server stays permissive.
- **Background job with per-month progress and per-month failure (chosen).** Reuses a pattern
  already in the codebase and already tested, makes a long range legible, and lets a partial
  failure be reported honestly instead of collapsed into a single verdict.

## Consequences

- `ImportResult` is no longer the response body of `POST /api/import`; it becomes the **terminal
  state read through polling**. Its per-month detail is a `MonthlyImport` line (`imported`,
  `alreadyPresent`, failed or not) alongside the range-wide aggregates (`byCategory`, `results`,
  totals), which stay consolidated — a 12 × 9 table of figures is not a summary.
- Closing the browser no longer cancels an Import: the job keeps running in the local server and
  its outcome is there on the next poll. There is **no cancel** endpoint; the reason to want one
  (an accidental 190-month range) is handled before the job starts, by the UI confirmation.
- Client-side, the start+poll loop mirrors `runAnalysis`. Whether the two collapse into one shared
  helper is a refactor to judge on the code, not a decision this ADR makes.
- The all-history shortcut (deriving the range from chess.com's `/games/archives` endpoint) is
  **deferred**. It adds a dependency on a further endpoint and no capability the range does not
  already provide; once the range ships it reduces to computing bounds and submitting.
