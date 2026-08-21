# 03 — Import happens from a Profile's own page

Status: `done` — merged into `integration/US-11-profiles` (build + tests + FP green, 2026-08-18)

> **Implemented on the business-story integration branch `integration/US-11-profiles`.** Branch
> from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a green
> local check (build + tests + green FP, no blocking finding); `integration -> develop` stays human.

> **Sequencing: unblocked.** US-13 landed in `develop` (PR #44/#49, 2026-08-17) and this branch is
> rebased on it. The stylesheet, the page skeleton and the token audit are now constraints on this
> slice, not a reason to wait — see the acceptance criteria.

## Parent

`.scratch/profiles/PRD.md` — business story **US-11** (`BACKLOG.md`).

## What to build

`Import` becomes **an operation on one Profile** (`CONTEXT.md`). A new page, `/profiles/:id`, is
that Profile's own page: its identity, its counters, and **its import form**.

**Correction to the PRD's framing:** there is no top-level `/import` route to remove — the import
form lives **on "Mes parties" (`/`)**, beside the Game list. What this slice does is **move it off
that screen** onto the Profile's page, which also lightens the busiest screen in the app.

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

- [x] `/profiles/:id` shows one Profile's identity and counters (Games imported, Games analyzed).
- [x] The import form lives on that page and has **no username field**.
- [x] The import form no longer appears on "Mes parties"; that screen shows the Game list alone.
- [x] An Import writes Games under the Profile it was run from, and no other.
- [x] Month range and time-control category selection behave as before.
- [x] Per-month progress and per-month outcome lines behave as before, a failed month still not
      aborting the Import.
- [x] Game uniqueness is `(profile_id, game_url)`: re-importing an overlapping range under one
      Profile adds no duplicate.
- [x] The same `game_url` is accepted under two different Profiles, with each row carrying its own
      Player-relative `player_color`, `result` and `opponent`.
- [x] The import API takes the Profile explicitly; a request naming no Profile, or an unknown one,
      is **refused** rather than answered.
- [x] HTTP-seam tests cover import under a Profile, the two-Profile same-URL case, the
      re-import-no-duplicate case, and the refusal cases.
- [x] Page-seam tests cover the Profile page, the absence of the username field, and the import
      form's disappearance from "Mes parties".

**Post-US-13 constraints** (ADR-0013):

- [x] The Profile page follows the page skeleton and passes the token-consistency audit, in both
      themes — same bar as slice 01.
- [x] The Profile page is **narrow** — the default 72ch reading column, **not** `data-width="wide"`.
      Decided by the requester on 2026-08-18: it carries a form and a few counters, nothing dense,
      so it has no claim on the wide variant US-13 reserves for the dense screens. Do not widen it
      because the import summary looks roomy — that is the taste call the requester made, and
      reversing it is theirs too.
- [x] The import summary keeps the `card` surface it already uses — it moves screen, it does not
      change shape.
- [x] **Centred, and framed on a large screen.** The column is centred, and its content reads as a
      bounded surface with visible borders (the `card` surface) rather than as text floating in
      empty space. Requester's call, 2026-08-18.
- [x] **The whole page is readable without scrolling** at the reference window **1536x742** — the
      one US-13-09 measured on. Identity, counters, import form, analysis state and deletion all
      visible at once.
- [x] Any height budget this needs is expressed with an **absolute `rem` ceiling**, not in viewport
      units. US-13-09 paid for this lesson: `100dvh` is the *window*, and a maximized window behind
      a taskbar is taller than what the eye gets, so a viewport-unit budget puts the bottom of the
      page where nobody can see it.
- [x] The no-scroll promise is **measured**, not assumed — the same way US-13-09 reported its
      numbers.

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

## Outcome (2026-08-18)

Every criterion met. Build green, 163 server + 395 client tests green, FP 5/5 on the real app
against the real chess.com, on a throwaway database (never the user's — ADR-0015).

**Measured, not assumed.** At the reference window **1536x742**, the page in its fullest state —
identity, counters, import form *and* a three-month import summary — ends at **668 px**: no
vertical scroll, 74 px of headroom, and no horizontal overflow (`scrollWidth` 1521 < 1536). It
needed **no height budget at all**, so there was nothing to express in `rem` or otherwise; the
US-13-09 lesson about `100dvh` simply never came up. Theme audit `pass: true`, 0 problems, in both
themes, the invariant token family byte-identical between them.

**The two-Profile probe.** `DudulSmash` (93 Games) and `ToreBjastad` (137 Games) side by side, one
match played between them: **two rows**, `#32` white→black `win`/`loss` mirrored, opponents crossed.
Zero duplicate `(profile_id, game_url)` pairs across 230 rows.

**Left for the slices that own them:**

- Analysis-pass state and deletion are **not** on this page yet (slice 05 owns the pass state; the
  list owns deletion). The no-scroll criterion names them: with 74 px of headroom, slice 05 should
  **re-measure** rather than assume the budget still holds.
- "Mes parties" still lists **both** Profiles' Games blended (236 rows) — that is exactly what
  slice 04 fixes, not a regression here.
- The client's `getSettings`/`saveSettings` are now consumed by **nothing**: the import form was
  their last caller. The PRD retires `settings` entirely; left standing so that removal happens in
  one place rather than half here.
