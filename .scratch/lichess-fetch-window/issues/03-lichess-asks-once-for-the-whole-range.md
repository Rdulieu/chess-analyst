# 03 — Lichess asks once for the whole range

Status: `ready-for-agent`

> **Implemented on the business-story integration branch `integration/US-17-lichess-fetch-window`.**
> Branch from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a
> green local check (build + tests + green FP, no blocking finding); `integration -> develop` stays
> human.

## Parent

`.scratch/lichess-fetch-window/PRD.md` — business story **US-17** (`BACKLOG.md`).

## What to build

The payoff. The Lichess adapter makes **one request** for the entire range instead of one per month,
and month coverage is **derived from the Games** rather than from the requests.

- The export is asked for the whole span in a single `since`/`until` request, still `sort=dateAsc`,
  still ndjson relayed as it arrives.
- **Coverage is read off the Games in date order**: every month before the last Game received is
  covered. The per-month lines the Player sees are unchanged in form — the month remains the unit of
  **reporting**, and stops being the unit of **fetching** (`CONTEXT.md`, `Monthly import`).
- A month the Player was inactive in still reads as a plain zero. **This is the assertion the whole
  story must not break**: a gap in the history stays distinguishable from a gap in the fetching.
- **No bound on the range.** Slicing into yearly requests would rebuild the burst this slice removes
  — and with it the per-IP throttle and the one-minute pauses — to buy a sign of life that streaming
  already gives.
- The `429` **pre-first-byte** retry stays (ADR-0018 decision 5), but its message must name the
  **range**: it says "reprise du mois" today, which would misname what resumes.

**Also in this slice, because it is the same subject matter and the same file.** Three places still
claim Lichess refuses IPv6 on the export endpoint. That conclusion was drawn from measurements taken
in one direction only, and **the exact opposite reproduced on 2026-08-22** (IPv4 → `429`,
IPv6 → `200`, two accounts seconds apart) after the reference import had burned the pinned IPv4. The
explanation covering both is a **per-IP throttle on the export endpoint**, keyed to a recent burst.

- The pin is **kept and demoted**: no longer a "correctness requirement" — it never was — but a
  determinism choice, one variable fewer when diagnosing a `429`.
- Correct the client's own comment, `path-0-bootstrap.md`'s precondition, and PR #52's body.
- One request is not a burst, so this slice largely dissolves the question.

chess.com is untouched: it keeps its month loop inside its adapter.

## Acceptance criteria

- [ ] Importing a Lichess range issues **one** export request, whatever the number of months.
- [ ] Per-month lines are still produced, one per month of the range, in order.
- [ ] Months with no Games read as **zero**; months with Games carry their real counts.
- [ ] Totals, category tallies and result tallies match what the month-by-month import produced for
      the same range.
- [ ] No one-minute pause occurs on a nominal import.
- [ ] The `429` retry still fires when the **response** is a 429, and its message names the range.
- [ ] Re-importing the same range adds nothing (dedup by URL).
- [ ] chess.com's requests and behaviour are unchanged.
- [ ] The IPv4 pin is kept, and its comment states what is actually known.
- [ ] `path-0-bootstrap.md`'s precondition and PR #52's body no longer claim an IPv6 refusal.

### Feature Path (FP)

1. Import a Lichess history covering **both empty and populated months** → one line per month, the
   empty ones at zero, the populated ones at their real counts.
2. The import completes **without any minute-long pause**.
3. The imported Games are findable under that Profile, and under no other.
4. Importing the same range a second time adds nothing and reports them all as already present.
5. A chess.com import run afterwards behaves exactly as before.

Verify: UI first — the import summary and the Games list. Probe the store only to confirm scoping.

## Blocked by

- `.scratch/lichess-fetch-window/issues/02-the-port-speaks-a-range.md`
