# 04 — An interruption says where it stopped, and what to re-run

Status: `ready-for-agent`

> **Implemented on the business-story integration branch `integration/US-17-lichess-fetch-window`.**
> Branch from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a
> green local check (build + tests + green FP, no blocking finding); `integration -> develop` stays
> human.

## Parent

`.scratch/lichess-fetch-window/PRD.md` — business story **US-17** (`BACKLOG.md`).

## What to build

When the stream breaks mid-flight, the Player must end up with **everything they need to finish the
job themselves** — and nothing they have to work out.

- **No retry after the first byte.** This applies ADR-0010's standing no-retry rule rather than
  excepting it. Recovery is the Player re-running, which dedup by URL makes safe and cheap.
- **The Import does not throw.** It returns its summary — a failed month has never aborted an Import.
  The Player sees what got in and what did not, on one screen.
- **The last month received is declared NOT covered** and is included in the range to re-run. A
  stream dying mid-March leaves March partial; re-fetching a half-imported month is free, while
  announcing it covered is a silent, permanent hole. We over-declare incompleteness, never
  completeness.
- Months after the stop carry their existing per-month failure line, in words and with a
  non-chromatic cue.
- A **global statement** in the summary's existing message field, **in the import form's own
  `YYYY-MM` vocabulary so the range can be retyped as-is**:

  > « Le flux s'est interrompu après **2020-03**. Les parties récupérées sont **conservées**. Pour
  > couvrir le reste, relancez un import de **2020-04** à **2023-08**. »

  Three facts, none decorative: where it stopped, that nothing is lost, and the exact range. Without
  the second, the Player assumes the whole import must be redone.

Resuming the stream at the last Game's date was **rejected**: it looks like recovery, reopens the
door to bursts, and implies a completeness that cannot be guaranteed.

## Acceptance criteria

- [ ] A stream breaking mid-flight produces a summary, not an error page.
- [ ] Games received before the break are persisted and findable.
- [ ] The global message names the last **fully covered** month, states the Games are kept, and gives
      the remaining range.
- [ ] That range is expressed in the same `YYYY-MM` form the import field accepts, and starts at the
      month the stream broke in — never after it.
- [ ] Every month from the break onwards carries a failure line, distinguishable from a zero month
      without relying on colour.
- [ ] Re-running the stated range completes the history and duplicates nothing.
- [ ] Nothing is retried automatically after the first byte.
- [ ] A nominal, unbroken import shows no such message.

### Feature Path (FP)

1. Start an import whose stream breaks partway → the screen shows the **summary**, not an error.
2. It states **after which month** the stream stopped, and that the Games already fetched are kept.
3. It gives the remaining range in a form that can be **typed straight back into the import field**.
4. The month the break happened in is reported as **not covered**.
5. Re-run exactly the stated range → the history is complete and nothing is duplicated.
6. Run a nominal import → no interruption message appears.

Verify: UI first — the summary and the import form. Probe the store only to confirm no duplicates.

## Blocked by

- `.scratch/lichess-fetch-window/issues/03-lichess-asks-once-for-the-whole-range.md`
