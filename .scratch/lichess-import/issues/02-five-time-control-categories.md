# 02 — Five Time control categories

Status: `ready-for-agent`

> **Implemented on the business-story integration branch `integration/US-12-lichess-import`.**
> Branch from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a
> green local check (build + tests + green FP, no blocking finding); `integration -> develop` stays
> human.

> **Sequencing note.** This slice is **not logically blocked** by 01: the vocabulary, the migrations
> and the screens are independent of the port refactoring. It is sequenced after 01 only because both
> touch the import module, and a collision there would cost more than the wait.

## Parent

`.scratch/lichess-import/PRD.md` — business story **US-12** (`BACKLOG.md`).

## What to build

`Time control category` becomes **our** five-value vocabulary instead of chess.com's four (see
`CONTEXT.md`): `bullet`, `blitz`, `rapid`, `classical`, `correspondence`. Two changes, one
addition and one rename:

- **`classical` is added**, because it has no honest home: folded into `rapid` it would average a
  10-minute game with a 60-minute one, folded into correspondence it would mix real-time play with
  move-a-day play.
- **chess.com's `daily` is renamed `correspondence`** — the same concept under the game's own word,
  which is the one that survives now that chess.com is not the only Platform.

No Lichess code is involved. This slice makes room, and the room is visible: a Player can already
tick `classical` in the import form (it will simply never match a chess.com game), and every
per-pace breakdown carries five columns.

**Two migrations are owed** (CLAUDE.md, ADR-0015 — *nothing rebuilds `Evaluation`s*). Both
non-destructive, re-runnable, failing loudly rather than leaving rows half-assigned:

- every `daily` value on Games becomes `correspondence`;
- the move-habit counter column `daily` is renamed `correspondence`, and a new `classical` counter
  column is added `NOT NULL DEFAULT 0`. The default is **honest without a backfill**: every existing
  row comes from chess.com, which never produced a `classical` game. That is the argument to check,
  not to assume.

## Acceptance criteria

- [ ] The category vocabulary is the five values everywhere: import scope, storage, aggregates, API
      contracts, client types
- [ ] Migration: every stored `daily` Game is `correspondence` afterwards; the count of Games is
      unchanged
- [ ] Migration: the move-habit counters are preserved value-for-value under the renamed column, and
      `classical` starts at zero
- [ ] **No `Evaluation` is lost or recomputed** by either migration
- [ ] Both migrations are re-runnable (running twice changes nothing the second time) and fail loudly
      rather than half-assigning rows
- [ ] The import form offers the five categories, and a range import scoped to `classical` alone is
      accepted
- [ ] `/stats`, `/openings` and the move-habit explorer break down over the five categories, and the
      per-category figures still sum to the in-scope total
- [ ] No screen or message says "daily" any more
- [ ] Build and the full test suite green

### Feature Path (FP)

1. Start from a database holding already-imported and already-analyzed chess.com games, then run the
   migration → the games previously shown as `daily` now read `correspondence`, and the analyzed
   games are still analyzed, with their evaluations intact
2. Open `/stats`, `/openings` and the move-habit explorer → each breaks down over five categories,
   and the per-category numbers add up to what was imported
3. Start an import → `classical` and `correspondence` can both be ticked, and an import scoped to
   `classical` alone runs and reports zero rather than failing

Verify: UI first; probe the database only to confirm the evaluations survived, which the UI cannot
fully show.

## Blocked by

- `.scratch/lichess-import/issues/01-platform-is-a-value.md`
