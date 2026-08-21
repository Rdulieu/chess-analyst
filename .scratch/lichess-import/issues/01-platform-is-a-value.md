# 01 — The Platform is a value, not a word

Status: `ready-for-agent`

> **Implemented on the business-story integration branch `integration/US-12-lichess-import`.**
> Branch from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a
> green local check (build + tests + green FP, no blocking finding); `integration -> develop` stays
> human.

## Parent

`.scratch/lichess-import/PRD.md` — business story **US-12** (`BACKLOG.md`).

## What to build

The app currently treats "the external source" and "chess.com" as the same thing. This slice
separates them, **without adding a second Platform** — chess.com keeps being the only one, and
everything a Player can do keeps working identically. What changes is that the Platform becomes a
value the code reads, instead of a word it hardcodes.

Three moves, end to end:

- **The port speaks the domain** (ADR-0016). `PlatformClient` replaces the chess.com-typed client,
  exposing an account lookup and a month fetch. The month fetch answers `{ totalFetched, games }`
  where the games carry a neutral shape — canonical URL, PGN, opponent, the Player's side, the
  Player-relative result, date, `Time control category`, opening code and name. No caller sees a
  chess.com payload any more. `totalFetched` keeps exactly its current meaning: everything the
  Platform returned, out-of-scope games included.
- **chess.com becomes an adapter.** The chess.com→Game translation, the PGN-header opening parse,
  the side-result normalisation and the variant filter move into it — they are chess.com-isms
  currently wearing import-logic clothing. What stays in the import module is what is genuinely
  ours: the month loop, per-month fault tolerance, the Player's category filtering, deduplication by
  URL, persistence, move-habit precomputation.
- **The client is resolved per Profile.** A single injected client becomes a registry keyed by
  Platform; the import job and the profile-creation route pick from `profile.platform`, because the
  Platform belongs to the `Profile` (ADR-0014) and is never chosen at import time.

And the visible half: the three places that spell "chess.com" in plain text — the current-profile
banner, the profile list, and the import screen — name the Platform **of the Profile**, read from
data. Same for the profile-creation error messages.

`profiles.platform` widens from a single-value type to `chesscom | lichess`. **No migration is
owed**: it is a type widening, no stored value changes.

## Acceptance criteria

- [ ] A chess.com import behaves exactly as before: same games, same per-month lines, same summary
      figures, same `totalFetched` semantics
- [ ] Nothing outside the chess.com adapter references a chess.com payload shape
- [ ] The import module contains no Platform-specific branch: no switch on payload shape, no
      variant filter, no result-code table, no PGN-header parsing
- [ ] The client registry resolves from `profile.platform`; the import job and the profile route no
      longer receive a single hardcoded client
- [ ] `profiles.platform` accepts `chesscom` and `lichess`; existing rows are untouched
- [ ] The current-profile banner, the profile list and the import screen each name the Profile's
      Platform, read from data rather than hardcoded
- [ ] Profile-creation errors name the Platform, and still distinguish "this account does not
      exist" from "I could not reach the site"
- [ ] The existing import, range and job test suites are unchanged in intent — only the faked type
      differs
- [ ] Build and the full test suite green

### Feature Path (FP)

1. Under a chess.com Profile, import a populated month → the games arrive, with the same summary
   figures and the same per-month lines as before this slice
2. Look at the current-profile banner, the profile list, and the import screen → each names
   chess.com, and the name comes from the Profile rather than from fixed text
3. Try to create a Profile for an account chess.com does not know → the refusal names chess.com and
   says the account does not exist, distinctly from a "could not reach" failure

Verify: UI first.

## Blocked by

None - can start immediately.
