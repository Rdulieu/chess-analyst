# 05 — What Lichess sends that we must not keep

Status: `done` — merged into `integration/US-12-lichess-import` (build + tests + FP 3/3 verts ; défaut réel trouvé et corrigé (PGN sans coup), 2026-08-21)

> **Implemented on the business-story integration branch `integration/US-12-lichess-import`.**
> Branch from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a
> green local check (build + tests + green FP, no blocking finding); `integration -> develop` stays
> human.

## Parent

`.scratch/lichess-import/PRD.md` — business story **US-12** (`BACKLOG.md`).

## What to build

Lichess answers more kinds of game than chess.com does, and three of them must never become a
`Game` (see `CONTEXT.md`, `Time control category`). This slice draws that line, and makes it visible
in the summary rather than silent.

- **Variants** (chess960, atomic, …) — out of scope, as they already are for chess.com. A game that
  is not the game is worth nothing to these aggregates.
- **Games started from an arbitrary position** — out of scope too, and this one is not rare: it was
  5% of the reference account. Normal rules, but our FEN- and ECO-keyed aggregates all assume the
  initial position.
- **Games against the computer** — out of scope, for a different reason. The opponent is not an
  account (there is no name to record), and every aggregate here asks a question about play against
  people. Decisively: **chess.com never exposes them at all**, so importing Lichess's would make two
  Profiles silently incomparable. The reference account has 48 such games, so this is a real
  population, not a defensive check.
- **Aborted games are imported**, not dropped — the mirror-image of the same principle. Both
  Platforms send them, so keeping them on both is what keeps the corpus the same kind of thing. They
  land in the `Other` opening bucket, having no classifiable opening.

`totalFetched` keeps its meaning — **everything the Platform returned**, out-of-scope games
included — so the summary shows the Player that the Platform sent more than what concerns them,
instead of quietly narrowing the number to match.

## Acceptance criteria

- [ ] Variant games are never stored as Games
- [ ] Games started from an arbitrary position are never stored as Games
- [ ] Games against the computer are never stored as Games, and nothing invents an opponent name
- [ ] Aborted games **are** stored, and fall into the `Other` opening bucket
- [ ] `totalFetched` counts everything the Platform returned, including out-of-scope games; the
      imported count does not
- [ ] The summary lets the Player see that the fetched total exceeds what was imported
- [ ] A month containing only out-of-scope games is reported as covered with zero imported, not as a
      failure
- [ ] `/openings` totals stay consistent: the per-opening counts sum to the in-scope games, with the
      unclassified ones under `Other`
- [ ] Build and the full test suite green

### Feature Path (FP)

1. Import a month containing variants and games against the computer → none of them appear in the
   game list
2. Read that import's summary → the fetched total is **higher** than the imported count, so it is
   visible that the Platform sent more than what concerns the Player
3. Open `/openings` → the unclassified games are grouped under `Other`, and the totals stay coherent
   with what was imported

Verify: UI first.

## Blocked by

- `.scratch/lichess-import/issues/04-a-lichess-month-lands.md`
