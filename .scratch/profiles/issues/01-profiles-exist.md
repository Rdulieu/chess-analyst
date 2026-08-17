# 01 — A Profile exists: create, list, select, delete

Status: `ready-for-agent`

> **Implemented on the business-story integration branch `integration/US-11-profiles`.** Branch
> from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a green
> local check (build + tests + green FP, no blocking finding); `integration -> develop` stays human.

> **Sequencing:** do not start before **US-13 (stylesheet)** has landed and this branch is rebased
> on its outcome. US-13 reworks the same screens. See the PRD's *Further Notes*.

## Parent

`.scratch/profiles/PRD.md` — business story **US-11** (`BACKLOG.md`).

## What to build

The `Profile` as a thing that exists on its own, before it owns anything. A `Profile` is one
account on one platform — the pair (platform, username), see `CONTEXT.md` and ADR-0014 — and this
slice makes it creatable, listable, selectable and deletable, end to end.

Creating a Profile takes a chess.com username and **validates it against chess.com's public player
endpoint**, storing the **canonical casing chess.com returns** rather than what was typed. That is
what stops `RDulieu` and `rdulieu` from becoming two Profiles quietly splitting one history in
half. If the platform cannot be reached, creation is **refused** — a Profile that was never
validated must not blend into the list looking like the others.

The Profile carries its **platform** from the start (`chesscom` is the only value implemented).
That column is what makes US-12 (Lichess) a new value and an import client rather than a new
concept.

A dedicated page at `/profiles` lists the Profiles, creates one, selects the **current** one, and
deletes one. The current selection lives **client-side** and is persisted locally, so it survives a
reload — the server stays stateless (PRD, *API*). Nothing else in the app is scoped yet: this slice
adds the notion, later slices attach data to it.

## Acceptance criteria

- [ ] A `profiles` table holds id, platform, username (canonical casing) and a creation timestamp,
      unique on `(platform, username)`.
- [ ] Creating a Profile calls chess.com's public player endpoint and stores the canonical username
      it returns.
- [ ] Creating a Profile whose username differs only by casing from an existing one **selects the
      existing Profile** — no duplicate row.
- [ ] Creating a Profile for a username chess.com does not know is refused, with a message naming
      the problem.
- [ ] Creating a Profile is refused when chess.com is unreachable — no unvalidated Profile is ever
      persisted.
- [ ] `/profiles` lists every Profile with its platform and username.
- [ ] One Profile can be marked current from `/profiles`, and the selection survives a reload.
- [ ] Deleting a Profile asks for confirmation naming it, then removes it.
- [ ] Deleting the current Profile leaves nothing selected.
- [ ] The server holds no "current profile" state — the selection is client-side only.
- [ ] Server tests at the HTTP seam (`server/test/api.test.ts`) cover creation, canonicalisation,
      duplicate-by-casing, unknown username, unreachable platform, and deletion.
- [ ] Client tests at the page seam cover the list, the creation error surfacing, and the
      persistence of the selection.

### Feature Path (FP)

1. I open the profiles area with no Profile yet → I am invited to create one, and the list is empty.
2. I create a Profile from a real chess.com username → it appears in the list, spelled the way
   chess.com spells it.
3. I create the same username with different casing → no second entry appears; the existing Profile
   is the one I end up on.
4. I try to create a username that does not exist on chess.com → creation is refused and says why;
   the list is unchanged.
5. I select a Profile, then reload the app → the same Profile is still the current one.
6. I delete a Profile after confirming → it is gone from the list.

Verify: UI first. Probe the database only to confirm no duplicate row survived step 3.

## Blocked by

None — can start immediately (subject to the US-13 sequencing note above).
