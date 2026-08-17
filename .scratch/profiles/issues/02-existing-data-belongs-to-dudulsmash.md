# 02 — Existing data belongs to DudulSmash

Status: `ready-for-agent`

> **Implemented on the business-story integration branch `integration/US-11-profiles`.** Branch
> from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a green
> local check (build + tests + green FP, no blocking finding); `integration -> develop` stays human.

> **Sequencing: unblocked.** US-13 landed in `develop` (PR #44/#49, 2026-08-17) and this branch is
> rebased on it. The stylesheet, the page skeleton and the token audit are now constraints on this
> slice, not a reason to wait — see the acceptance criteria.

## Parent

`.scratch/profiles/PRD.md` — business story **US-11** (`BACKLOG.md`).

## What to build

The migration that attaches everything already in the database to a Profile, **without losing
anything**. Per **ADR-0015**, the local database is no longer throwaway: it holds analyzed Games
whose `Evaluation`s only engine time can rebuild. "Wipe and re-import" is not a plan here.

`games`, `move_habits` and `analysis_passes` each gain a `profile_id`. `evaluations` gains nothing
— it hangs off `games` through `game_id` and is scoped transitively (ADR-0014). `move_habits`'
primary key gains `profile_id`, so two Profiles' counters cannot collide. Game uniqueness moves
from `game_url` to `(profile_id, game_url)`; the slice that exercises that is 03.

The migration runs in a fixed order, and the order **is** the safety property: create the
`DudulSmash` Profile → add `profile_id` **nullable** → assign every existing row to it → tighten
to **`NOT NULL`**. The final tightening is the assertion — a half-assigned run **fails** rather
than completing quietly. Non-destructive and re-runnable.

Reference state in the user's real database, verified during grilling: **166 Games, 20 analyzed,
1199 Evaluations, 5754 `move_habits` rows, 1 `analysis_passes` row** — all `DudulSmash`, confirmed
from the PGN headers, so there is nothing to arbitrate. The `settings` table is **empty**: the
"remembered username" it was meant to hold was never persisted, so there is nothing to convert
there — drop the username key (or the table) rather than migrating it.

## Acceptance criteria

- [ ] `games`, `move_habits` and `analysis_passes` carry a `NOT NULL profile_id` referencing
      `profiles`.
- [ ] `move_habits`' primary key includes `profile_id`.
- [ ] The migration creates the `DudulSmash` chess.com Profile if it does not already exist.
- [ ] Every pre-existing row in the three tables is assigned to that Profile.
- [ ] No `Evaluation` is lost or altered; the count before and after is identical.
- [ ] The migration is **re-runnable**: a second run changes nothing and does not fail.
- [ ] The migration **fails loudly** if any row would be left unassigned — no partial success, no
      "legacy"/default Profile absorbing leftovers.
- [ ] The unused `settings` username key is removed rather than migrated.
- [ ] A migration test exists, using a **file** database (not `:memory:`, which cannot be
      reopened), seeded with pre-Profile rows through **raw SQL** — the schema no longer allows an
      insert without `profile_id`. Prior art: `server/test/db-open.test.ts`.
- [ ] That test asserts the Profile is created, every row is assigned, no Evaluation is lost, and a
      second run is a no-op.

### Feature Path (FP)

1. I take a copy of the real database as it stands before this slice → it holds 166 Games, 20 of
   them analyzed.
2. I run the migration against that copy → it completes without error.
3. I open the profiles area → `DudulSmash` is listed, on chess.com.
4. Its counters read 166 Games imported, 20 analyzed.
5. I run the migration a second time on the same database → it completes, and the counters are
   unchanged.

Verify: UI first for steps 3-4. Probe the database to confirm the Evaluation count is untouched
and that no row anywhere carries a null `profile_id`.

## Blocked by

- `.scratch/profiles/issues/01-profiles-exist.md` — the `profiles` table and the Profile listing
  this slice migrates into and verifies through.
