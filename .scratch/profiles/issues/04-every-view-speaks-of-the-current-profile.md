# 04 — Every view speaks only of the current Profile

Status: `ready-for-agent`

> **Implemented on the business-story integration branch `integration/US-11-profiles`.** Branch
> from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a green
> local check (build + tests + green FP, no blocking finding); `integration -> develop` stays human.

> **Sequencing:** do not start before **US-13 (stylesheet)** has landed and this branch is rebased
> on its outcome. This slice adds a banner to **every** page, which is exactly where US-13's rework
> lands. See the PRD's *Further Notes*.

## Parent

`.scratch/profiles/PRD.md` — business story **US-11** (`BACKLOG.md`).

## What to build

The payoff slice: every analysis view stops speaking about the whole database and starts speaking
about **one Profile**. The Game list, the global stats, the weak openings, the move-habit explorer
and the danger positions all read the current Profile's Games and nothing else — the partitioning
property of ADR-0014, made observable.

The scoping is carried **explicitly**: each read endpoint takes the Profile as a parameter, and the
server stays stateless — a response is always the answer to a question that named its Profile. A
request naming no Profile, or an unknown one, is **refused** rather than silently answered over all
rows. Silently answering is the failure mode this whole story exists to remove.

A **permanent banner** names the current Profile on every scoped page and links to `/profiles`. It
does not switch in place — selection lives on the dedicated page. The banner is not decoration: with
friends' Profiles in the app, `/danger` and `/openings` look identical for everyone, and reading a
friend's recurring mistakes while believing they are your own is a silent, easy confusion. The
banner is what makes the display unable to lie.

Two empty situations that must **not** be confused:

- **No Profile selected** on a scoped page → **redirect** to `/profiles`. One door in, never an
  unexplained blank screen.
- **A Profile selected but with no Games** → a proper **empty state** inviting an import. This is
  normal (a freshly created Profile) and redirecting here would send the user in circles about a
  problem they do not have.

## Acceptance criteria

- [ ] `/api/games`, `/api/stats`, `/api/openings`, `/api/danger` and `/api/move-habits` each take
      the Profile explicitly and answer about it alone.
- [ ] A request naming no Profile, or an unknown Profile, is refused — never answered over all rows.
- [ ] The Game list shows only the current Profile's Games.
- [ ] Global stats, `Win rate` included, are computed over the current Profile's Games only.
- [ ] `Weak opening`s are computed over the current Profile's Games only.
- [ ] `Move habit`s and `Opponent repl`ies aggregate the current Profile's Games only; two
      Profiles' counters never merge into one line.
- [ ] `Danger position`s are computed over the current Profile's Games only — a recurring Position
      is one *this* Player keeps reaching (`CONTEXT.md`).
- [ ] A banner naming the current Profile is present on every scoped page and links to `/profiles`.
- [ ] Selecting no Profile and opening a scoped page redirects to `/profiles`.
- [ ] Selecting a Profile with no Games shows an empty state inviting an import — not a redirect.
- [ ] HTTP-seam tests state the isolation property directly: data created under Profile A is absent
      from every answer given about Profile B, endpoint by endpoint.
- [ ] Page-seam tests cover the banner, the redirect, and the empty state.

### Feature Path (FP)

1. Two Profiles both hold imported Games, with clearly different histories.
2. I select the first → every analysis page names it in the banner and shows figures consistent
   with its Games alone.
3. I note a figure that is distinctive to that Profile on each page.
4. I switch to the second Profile from the profiles area → every page now names the second Profile,
   and every noted figure has changed.
5. Nothing from the first Profile's history appears anywhere while the second is current — no Game,
   no opening, no move habit, no danger position.
6. With no Profile selected, I open an analysis page → I am taken to the profiles area.
7. I select a Profile that has no Games and open an analysis page → I get an empty state inviting an
   import, not a redirect.

Verify: UI first throughout — this slice is about what the user sees being true.

## Blocked by

- `.scratch/profiles/issues/03-import-from-the-profile-page.md` — two Profiles must be fillable
  through the app before their isolation can be exercised.
