# 05 — Remember the Player's username (settings)

Status: ready-for-agent
Business ref: BACKLOG.md — US-2

**Integration branch.** Implemented on `integration/US-2-import-chess-com`: branch a `feature/*`
from it and merge back **into it** (auto-merge on a green local check), NOT into `develop`.

## Parent

`.scratch/import-chess-com/PRD.md` (US-2).

## What to build

Persist the Player's chess.com username so it survives across sessions, instead of retyping it on
every import. Lowest priority of US-2 (the import works without it — the username is passed in the
request until this slice).

- **Persistence**: a new `settings` table holding the single stored username (no multi-user concern
  per ADR-0002).
- **Relay**: `GET /api/settings` / `PUT /api/settings` to read and update the stored username. The
  import uses the stored username when the request omits it.
- **UI**: the import form's username field is prefilled from settings, and saving/importing
  persists it.

## Acceptance criteria

- [ ] A `settings` table stores the Player's username; `GET`/`PUT /api/settings` round-trip it.
- [ ] The import form's username field is prefilled from the stored username.
- [ ] After setting the username, reopening the app shows it already filled in.
- [ ] Changing the username persists the new value.

### Feature Path (FP)

UI-first, against the running app with the chess.com base URL pointed at a canned archive.

1. Enter a username and import → later reopen the app → the username is already prefilled, no re-entry needed.
2. Change the username → reopen → the new value is shown.

Verify: UI first (the prefilled field after reopening); the settings endpoint confirms persistence if needed.

## Blocked by

- Issue 02 (import UI).
