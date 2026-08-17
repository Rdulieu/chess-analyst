# 04 — Every view speaks only of the current Profile

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
- **The load failed** → **say so**. See below: this is not ours by origin, but it is ours by
  position.

### The load-failure finding comes here

US-13's HP replay filed `.scratch/games-load-failure/issues/01-a-failed-load-looks-like-an-empty-history.md`
(`needs-triage`): a failed `GET /api/games` renders the **empty-history invitation** — the screen
announced "no games yet" while 82 Games sat in the database, and pointed the Player at importing
what they already had. Loading, genuinely-empty and load-failed are collapsed into one state, and
the invitation is right for exactly one of them. The same shape likely exists on every screen that
fetches on mount.

**Fold it into this slice**, and close it on the technical backlog when done. The reason is
position, not scope creep: this slice adds a **fourth** situation to the same code — "no Profile
selected" — and writing a new empty state on top of an ambiguous one would make the ambiguity
worse. More directly: the criterion "a Profile with no Games shows an empty state" is only
meaningful if "no Games" cannot also mean "the request failed". We cannot assert what this slice is
for without fixing it.

Scope of the fix: the states are told apart and named on the screens that fetch on mount — a failed
load says the load failed and offers to retry; it never invites an import.

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
- [ ] A **failed** load is distinguished from an empty history: it says the load failed and offers a
      retry, and never renders the import invitation.
- [ ] The distinction holds on every screen that fetches on mount, not only "Mes parties".
- [ ] `.scratch/games-load-failure/issues/01-…` is closed, referencing this slice.

**Post-US-13 constraints** (ADR-0013):

- [ ] The banner lives in the **app chrome** US-13 built (`_chrome.scss`) and reads as chrome, not
      as page content.
- [ ] It marks the current Profile **without relying on colour alone** — the rule the navigation's
      current tab already follows.
- [ ] Banner, empty states and failure states all pass the token-consistency audit and are correct
      in both themes.

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
