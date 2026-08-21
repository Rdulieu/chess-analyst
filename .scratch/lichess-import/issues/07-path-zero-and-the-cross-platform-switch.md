# 07 — Path 0 and the cross-platform switch (HITL)

Status: `ready-for-agent` — **HITL**: touches the real Lichess API and changes the HP suite, both of
which need the requester's arbitration.

> **Implemented on the business-story integration branch `integration/US-12-lichess-import`.**
> Branch from it, PR back into it — **not** `develop`. This slice does **not** auto-merge: it is the
> one that reports the HP suite for the `integration -> develop` PR, which stays a human decision.

## Parent

`.scratch/lichess-import/PRD.md` — business story **US-12** (`BACKLOG.md`).

## What to build

The agentic apex for this story, against the **real** Lichess API rather than a fixture.

- **Path 0 gains a Lichess reference profile.** Path 0 is already the prerequisite outside the
  three-HP cap: it creates the reference profiles, imports against the real API and leaves the
  snapshots the three journeys restore. This is therefore the one place where the new capability
  meets the live Platform, and the three HPs inherit it for free.
- **Reference account: `Metalyst`** — 403 games, 20 populated months across a 71-month span (2017-10
  to 2023-08), including 38 `classical` and 64 `correspondence`. Both new translations are exercised
  for real, and the empty months exercise the distinction the per-month lines exist for: a gap in the
  history versus a gap in the fetching.
- **No fourth HP.** The journey has not changed — import, then find your weak openings — only the
  site behind it. Instead **HP-01 gains one step**: switch from a chess.com Profile to the Lichess
  Profile, and check that the banner names the site and that every figure changes with it. That step
  tests something nothing tested before, since both reference profiles were chess.com until now.
- **The whole HP suite is re-run** and its result pasted into the `integration -> develop` PR, with
  the included issues listed.

**Known coverage limit, to state rather than gloss:** `Metalyst` has **no ultraBullet game and no
aborted game**, so those two rules stay fixture-only and never meet the real API. If that is not
acceptable, it needs a second reference account — a decision for the requester, not for the agent.

## Acceptance criteria

- [ ] Path 0 creates the Lichess reference Profile and imports a known range against the **real**
      Lichess API, leaving a restorable snapshot
- [ ] The imported figures are recorded as expected values the HPs can assert against
- [ ] Path 0 documents the IPv4 pin as a prerequisite, so a future failure is not misread as a rate
      limit
- [ ] HP-01 gains the cross-platform switch step, and the HP suite still numbers **three**
- [ ] The full HP suite is re-run and green, and its result is pasted into the
      `integration -> develop` PR alongside the list of included issues
- [ ] The `ultraBullet` and aborted-game coverage gap is stated explicitly in the PR, not left
      implicit
- [ ] Build and the full test suite green

### Feature Path (FP)

The HP suite itself, including the new step:

1. Run path 0 → the chess.com and Lichess reference Profiles both exist, each with its imported
   range, and the Lichess one shows `classical` and `correspondence` games
2. Run HP-01, HP-02, HP-03 → all three green
3. Within HP-01, switch from a chess.com Profile to the Lichess Profile → the banner names
   lichess.org and **every** figure on screen changes with it

Verify: UI first, against the real running app.

## Blocked by

- `.scratch/lichess-import/issues/02-five-time-control-categories.md`
- `.scratch/lichess-import/issues/05-what-we-do-not-keep.md`
- `.scratch/lichess-import/issues/06-month-boundary-and-rate-limit.md`
