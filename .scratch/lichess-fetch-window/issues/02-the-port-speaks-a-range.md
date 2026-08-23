# 02 — The port speaks a range; chess.com absorbs its month loop

Status: `ready-for-agent`

> **Implemented on the business-story integration branch `integration/US-17-lichess-fetch-window`.**
> Branch from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a
> green local check (build + tests + green FP, no blocking finding); `integration -> develop` stays
> human.

## Parent

`.scratch/lichess-fetch-window/PRD.md` — business story **US-17** (`BACKLOG.md`).

## What to build

Reshape the `PlatformClient` port from a month to a **range**, and make it **stream**. A refactoring
slice with nothing visible to show — the precedent is ADR-0018's own first slice, whose value was
entirely in what the next one did not have to fight.

- `fetchMonth(username, year, month)` returning `{ totalFetched, games }` becomes a range-shaped
  method that **yields** neutral `ImportedGame`s as they arrive, in date order.
- **chess.com's adapter absorbs the month loop.** It keeps issuing exactly the same monthly-archive
  requests, in the same order and the same number — the loop simply moves inside the adapter, where
  it describes chess.com rather than constraining every Platform.
- **Lichess's adapter also still loops its months**, for now. Collapsing it to one request is slice
  03; this slice must not change request counts anywhere.
- The neutral `ImportedGame` shape is untouched. What changes is the **unit asked for**, never the
  vocabulary answered in (ADR-0018 decision 1, as amended).

`readNdjson` is already an `AsyncGenerator`; `fetchMonth` is what breaks the stream by materialising
it into an array. This slice stops breaking something that already flowed.

**`totalFetched` must survive.** It counts what the Platform **had**, out-of-scope games included, so
a month mostly full of variants never reads as empty. A generator that only yields in-scope Games
loses that count — carry it, either on a richer yielded item or as the generator's return value.

The service keeps inserting **game by game, deduped by URL**, which is what will later make a partial
import partial rather than lost.

## Acceptance criteria

- [ ] The port exposes a range-shaped, streaming method; `fetchMonth` is gone from the port.
- [ ] chess.com issues **exactly the same requests** as before — same URLs, same order, same count.
- [ ] Lichess issues the same requests as before (one per month); no behaviour change yet.
- [ ] `totalFetched` still reports what the Platform had, out-of-scope games included.
- [ ] Per-month lines, totals, category tallies and result tallies are byte-identical to before on
      both Platforms.
- [ ] The Player's chosen time control categories are still honoured, and filtering still happens
      where it did (the Player's choice, not the adapter's).
- [ ] Games are still filed under the Profile the import was run from.
- [ ] **The chess.com behaviour tests pass untouched** — that is the assertion, not a side effect.
- [ ] Lower tier: the shared fake client becomes generator-producing, and gains the ability to yield
      N Games and then throw (needed by slices 03 and 04).

### Feature Path (FP)

1. Import a month range from a chess.com Profile → the summary, its per-month lines and its totals
   read **exactly as before**.
2. Import a month range from a Lichess Profile → same.
3. A range containing a month with no Games still shows that month at zero.
4. Re-importing the same range adds nothing and reports everything as already present.

Verify: UI first — the import summary as the Player reads it.

## Blocked by

- `.scratch/lichess-fetch-window/issues/01-a-truncated-stream-is-not-a-finished-one.md`
