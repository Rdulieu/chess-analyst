# 05 — path 0 asks once, and the gain is a figure

Status: `ready-for-agent`

> **Implemented on the business-story integration branch `integration/US-17-lichess-fetch-window`.**
> Branch from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a
> green local check (build + tests + green FP, no blocking finding); `integration -> develop` stays
> human.

## Parent

`.scratch/lichess-fetch-window/PRD.md` — business story **US-17** (`BACKLOG.md`).

## What to build

Amend `path 0` so the suite can tell this story shipped from it not having shipped, and so US-18
starts from a **measurement** instead of a deduction.

- **The reference span does not move.** `Metalyst` stays at **2017-10 → 2023-08**, its full 71
  months. `docs/test-scenarios/README.md`'s "do not shorten its span" rule is **not** reopened:
  US-17 removes the cost without removing the assertion the 51 empty months carry. That assertion is
  in fact now **better** tested — it used to check that 51 requests each answered empty, which is
  nearly tautological; it now checks that **slicing one stream into months** produces 51 zero lines,
  which is new code.
- **path 0 asserts the request count**: one export request for the whole range, not 71. Without this,
  nothing in the suite distinguishes US-17 delivered from US-17 undelivered.
- **path 0's duration is measured and reported**, against the reference (~3.5 min for the Lichess
  import, of which ~2.4 min was pure waiting across six one-minute pauses). The report must give the
  **measured duration and the delta**, not "it is faster".

This last point is the deliverable US-18 is waiting on: its entry says plainly that its figures are
**deduced, not measured**, so this slice hands it its first real datum.

## Acceptance criteria

- [ ] `path 0` still builds the three reference Profiles across two Platforms, unchanged.
- [ ] `Metalyst` is still imported over its full 71-month span, with **51 months at zero**.
- [ ] The scenario asserts the Lichess import cost **one** export request.
- [ ] The scenario's duration is measured and reported, with the delta against the reference figures.
- [ ] The precondition no longer claims Lichess refuses IPv6 (corrected in slice 03 — verify it took).
- [ ] The suite still holds at **three** HP; no fourth journey is added.
- [ ] The report distinguishes the Lichess import's own duration from the scenario's total, so US-18
      can attribute the gain.

### Feature Path (FP)

1. Run `path 0` end to end against the real Lichess → the three Profiles and both histories are in
   place, `Metalyst` over its 71 months with **51 at zero**.
2. The Lichess import cost **one** export request.
3. No minute-long pause occurred.
4. The run's duration is **measured and reported**, with its gap to the reference.
5. The two chess.com Profiles are unaffected, and the scoping assertions still hold.

Verify: UI first — the import summary and the Profiles screens, as path 0 already does.

## Blocked by

- `.scratch/lichess-fetch-window/issues/04-an-interruption-says-where-it-stopped.md`
