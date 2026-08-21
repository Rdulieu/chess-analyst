# 03 — A Lichess Profile exists

Status: `done` — merged into `integration/US-12-lichess-import` (build + tests + FP 4/4 verts, 2026-08-21)

> **Implemented on the business-story integration branch `integration/US-12-lichess-import`.**
> Branch from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a
> green local check (build + tests + green FP, no blocking finding); `integration -> develop` stays
> human.

## Parent

`.scratch/lichess-import/PRD.md` — business story **US-12** (`BACKLOG.md`).

## What to build

A `Profile` can be created on **Lichess**. This slice stops at existence: the Profile is created,
named, listed and selectable — importing under it comes next. That is deliberate, and it is what
makes this a tracer bullet rather than a layer: the Platform choice, the account lookup, the storage
and the screens all get exercised on a path a Player can actually walk.

- Profile creation gains a **Platform choice**. It is the only place a Platform is ever chosen; from
  then on it is a property of the Profile (ADR-0014), never a parameter of an Import.
- The Lichess adapter gains its **account lookup**. A 404 means "this account does not exist"; any
  other failure means "I could not ask". That distinction already exists and is still load-bearing —
  only the first is the Player's mistake.
- A **closed (disabled) Lichess account is treated as non-existent**. It will never hold a Game to
  import, and "not found" is the answer a Player can act on.
- The **canonical casing comes from the username Lichess answers** — directly, unlike chess.com
  where it has to be read off a profile URL. Storing what Lichess spells is what keeps `metalyst`
  and `Metalyst` from becoming two Profiles splitting one history.
- The same account name on two Platforms gives **two distinct Profiles**, per the unique
  (platform, username) pairing.

**The address family must be pinned to IPv4** for Lichess requests. See slice 04 for why this is a
correctness requirement and not a tuning knob; the account lookup is where it first matters.

## Acceptance criteria

- [ ] Profile creation lets the Player choose the Platform, and the choice is stored on the Profile
- [ ] Creating a Lichess Profile validates the account against Lichess before creating anything
- [ ] A username Lichess does not know is refused as non-existent, and the message names Lichess
- [ ] Lichess being unreachable is reported as "could not ask", distinctly from "does not exist", and
      no Profile is created
- [ ] A disabled Lichess account is refused as non-existent
- [ ] The stored username carries Lichess's own casing, whatever casing was typed
- [ ] Creating a Profile for an account that is already a Profile on that Platform selects the
      existing one rather than duplicating it
- [ ] The same name on chess.com and on Lichess yields two independent Profiles
- [ ] The banner, the profile list and the import screen name lichess.org for a Lichess Profile
- [ ] Lichess requests pin the address family to IPv4
- [ ] Build and the full test suite green

### Feature Path (FP)

1. Create a Profile, choosing Lichess and typing `Metalyst` → the Profile is created, named
   `Metalyst`, and the screen says lichess.org
2. Create a Lichess Profile for an account that does not exist → the refusal names Lichess and says
   the account does not exist
3. Create a chess.com Profile bearing the **same name** as the Lichess one → two distinct Profiles,
   each showing its own Platform, and selecting one shows that one
4. Type the reference account in a different casing → no second Profile appears; the existing one is
   selected

Verify: UI first.

## Blocked by

- `.scratch/lichess-import/issues/01-platform-is-a-value.md`
