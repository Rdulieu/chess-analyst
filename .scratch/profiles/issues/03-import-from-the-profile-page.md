# 03 — Import happens from a Profile's own page

Status: `ready-for-agent`

> **Implemented on the business-story integration branch `integration/US-11-profiles`.** Branch
> from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a green
> local check (build + tests + green FP, no blocking finding); `integration -> develop` stays human.

> **Sequencing:** do not start before **US-13 (stylesheet)** has landed and this branch is rebased
> on its outcome. US-13 reworks the same screens. See the PRD's *Further Notes*.

## Parent

`.scratch/profiles/PRD.md` — business story **US-11** (`BACKLOG.md`).

## What to build

`Import` becomes **an operation on one Profile** (`CONTEXT.md`). A new page, `/profiles/:id`, is
that Profile's own page: its identity, its counters, and **its import form**. The top-level
`/import` route is removed.

The import form **loses its username field**. The account to fetch is the Profile's own, already
validated at creation — which also removes the only way one account's Games could ever be imported
under another's Profile. Everything else about Import is unchanged: the contiguous month range, the
time-control subset, the per-month progress and the per-month outcome lines (US-9) all behave
exactly as before.

Game identity becomes unique on **`(profile_id, game_url)`**. Re-importing an overlapping range
under the same Profile still adds no duplicate; the **same match imported under two Profiles is two
rows**, each recorded from its own Player's side — that is ADR-0014's partitioning, not a dedup
bug.

`/profiles/:id` is the **only** route carrying an id. The analysis pages stay scoped by the current
selection (slice 04) — deliberately asymmetric: on a Profile's page you act *on* a named Profile;
elsewhere you read *the* current Profile's data.

## Acceptance criteria

- [ ] `/profiles/:id` shows one Profile's identity and counters (Games imported, Games analyzed).
- [ ] The import form lives on that page and has **no username field**.
- [ ] The top-level `/import` route no longer exists; nothing links to it.
- [ ] An Import writes Games under the Profile it was run from, and no other.
- [ ] Month range and time-control category selection behave as before.
- [ ] Per-month progress and per-month outcome lines behave as before, a failed month still not
      aborting the Import.
- [ ] Game uniqueness is `(profile_id, game_url)`: re-importing an overlapping range under one
      Profile adds no duplicate.
- [ ] The same `game_url` is accepted under two different Profiles, with each row carrying its own
      Player-relative `player_color`, `result` and `opponent`.
- [ ] The import API takes the Profile explicitly; a request naming no Profile, or an unknown one,
      is **refused** rather than answered.
- [ ] HTTP-seam tests cover import under a Profile, the two-Profile same-URL case, the
      re-import-no-duplicate case, and the refusal cases.
- [ ] Page-seam tests cover the Profile page and the absence of the username field.

### Feature Path (FP)

1. I open a freshly created Profile's page → it names that Profile and shows zero Games.
2. I import a range of months from that page → the Games arrive under it, with one outcome line
   per month in order.
3. Its counter reflects what was imported.
4. I replay the same range → no duplicate appears; the counter is unchanged.
5. I open a second Profile's page and import a range for it → its own Games arrive, and the first
   Profile's counter has not moved.

Verify: UI first. Probe the database only to confirm the two Profiles' Games are distinct rows.

## Blocked by

- `.scratch/profiles/issues/02-existing-data-belongs-to-dudulsmash.md` — `games.profile_id` must
  exist before an Import can write it.
