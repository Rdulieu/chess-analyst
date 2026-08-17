# PRD — Profiles

Business story: **US-11** — *Choisir mon profil et retrouver les parties importées et analysées
sous ce profil.*
Integration branch: `integration/US-11-profiles`. Grilling output: `CONTEXT.md` (`Profile`,
`Player`), **ADR-0014** (the Profile partitions the data), **ADR-0015** (the local database now
holds irreplaceable data).

## Problem Statement

The app is **implicitly single-player**. `settings` was meant to remember one chess.com username
(it never actually did — the table is empty), `games` has no owner at all, and every aggregate —
`move_habits`, `/stats`, `/openings`, `/danger`, `evaluations` — is computed over *every* row in
the database.

So there is exactly one thing this tool can do: study the history of whoever happened to be
imported. The user wants more than that. They want to study **their friends' play too** — to look
at one player's move habits, weak openings and danger positions in isolation, then switch to
another. Today, importing a second account would silently blend two histories: the move-habit
explorer would mix two repertoires, the win rates would average two players, and nothing on screen
would hint that anything was wrong. The figures would simply be false, quietly.

There is no way to say "show me this player", because the app has no notion of *which* player.

## Solution

Introduce the **`Profile`** — one account on one chess platform, the pair (platform, username) —
as the thing every view is about. A Profile is created once, validated against chess.com so it
cannot be a typo, and from then on it **owns** its Games and everything derived from them. Nothing
is ever shared between Profiles.

The user gets a dedicated area for them:

- **`/profiles`** lists the Profiles (name, platform, games imported, games analyzed), creates new
  ones, and is where the **current Profile** is selected.
- **`/profiles/:id`** is one Profile's own page: its identity and counters, **its Import**, its
  analysis-pass state, and its deletion. The top-level `/import` page goes away — importing is an
  operation *on a Profile*, and the username field disappears from the form because the Profile
  already knows it.

Everywhere else — `/games`, `/stats`, `/openings`, `/danger`, the explorer — the pages are
unchanged in purpose but now show **only the current Profile's** data, and a permanent banner
names that Profile so the user always knows whose figures they are reading.

The user's existing data is **migrated, not lost**: a `DudulSmash` Profile is created and the 166
imported Games — including the 20 analyzed ones and their 1199 Evaluations — are assigned to it.

## User Stories

1. As a user, I want to create a Profile from a chess.com username, so that I can tell the app
   whose games it should study.
2. As a user, I want the username checked against chess.com when I create the Profile, so that a
   typo fails immediately instead of producing a Profile that imports nothing.
3. As a user, I want the Profile stored under chess.com's own canonical spelling, so that
   `RDulieu` and `rdulieu` do not become two Profiles splitting one history in half.
4. As a user, I want creating a Profile that already exists to select it rather than duplicate it,
   so that I cannot end up with two entries for the same account.
5. As a user, I want the creation refused with a clear message when chess.com cannot be reached,
   so that I never end up with an unvalidated Profile indistinguishable from a validated one.
6. As a user, I want to see all my Profiles in one place with how many Games each holds and how
   many are analyzed, so that I can tell at a glance which ones are worth opening.
7. As a user, I want to select which Profile is current, so that the analysis views speak about
   the player I mean.
8. As a user, I want my selection remembered across page reloads and restarts, so that I do not
   re-select it every time I open the app.
9. As a user, I want a permanent banner naming the current Profile on every scoped page, so that I
   cannot mistake a friend's danger positions for my own.
10. As a user, I want the banner to take me to `/profiles`, so that switching Profile is always one
    click away from wherever I am.
11. As a user, I want to be taken to `/profiles` when no Profile is selected, so that I never land
    on an empty screen with no explanation of what is missing.
12. As a user, I want a Profile with no Games yet to show a proper empty state inviting me to
    import — not a redirect — so that "no Profile" and "no data" are never confused.
13. As a user, I want each Profile to have its own page, so that acting on a Profile is
    unambiguous about which one I am acting on.
14. As a user, I want to import Games from a Profile's own page, so that the account being fetched
    is the one named on screen.
15. As a user, I want the import form to have no username field, so that I cannot import one
    account's games under another's Profile.
16. As a user, I want the import range and time-control choices to work exactly as before, so that
    moving the form loses none of what US-9 gave me.
17. As a user, I want the per-month import progress and outcome lines to work exactly as before,
    so that a failed month is still distinguishable from an inactive one.
18. As a user, I want an Import to only ever add Games to the Profile it was run from, so that
    importing for a friend never touches my own history.
19. As a user, I want re-importing an overlapping range under the same Profile to add no
    duplicate, so that Import stays safe to re-run.
20. As a user, I want the same match imported under two Profiles to appear under both — mine as I
    played it, theirs as they played it — so that a game between us reads correctly from each side.
21. As a user, I want my Game list to show only the current Profile's Games, so that I browse one
    player's history at a time.
22. As a user, I want the global stats to count only the current Profile's Games, so that the win
    rate is that player's win rate.
23. As a user, I want the weak openings to be computed from the current Profile's Games only, so
    that a repertoire belongs to one player.
24. As a user, I want the move-habit explorer to aggregate only the current Profile's Games, so
    that two players' repertoires are never merged into one line.
25. As a user, I want the danger positions to be computed from the current Profile's Games only,
    so that a recurring position is one this player keeps reaching.
26. As a user, I want an Analysis pass to cover only the current Profile's Games, so that engine
    time goes where I pointed it.
27. As a user, I want a Profile's analysis-pass state shown on its own page, so that I know
    whether that player's history has been analyzed.
28. As a user, I want to delete a Profile with everything under it, so that a friend I no longer
    follow leaves nothing behind.
29. As a user, I want the deletion confirmation to name the Profile and the number of Games it
    will destroy, so that I cannot delete the wrong one by reflex.
30. As a user, I want deleting the current Profile to leave me on `/profiles` with nothing
    selected, so that the app never points at something that no longer exists.
31. As a user, I want my existing 166 imported Games to become `DudulSmash`'s Profile
    automatically, so that upgrading costs me nothing.
32. As a user, I want my 20 analyzed Games and their Evaluations preserved through the upgrade, so
    that I do not pay engine time again for work already done.
33. As a user, I want the upgrade to fail loudly rather than half-assign my data, so that a broken
    migration is obvious instead of silently lossy.
34. As a user, I want to run the upgrade twice with no ill effect, so that recovering from an
    interrupted run means re-running it.
35. As a developer, I want the Profile to carry the platform from the start, so that adding
    Lichess (US-12) is a new platform value and an import client, not a new concept.

## Implementation Decisions

### Domain and glossary

Settled during grilling and already written to `CONTEXT.md`:

- **`Profile`** = one account on one platform, the pair (platform, username). It is the **unit of
  partitioning**. A Profile never groups several accounts; consolidation, if ever needed, would be
  a grouping *above* Profiles.
- **`Player`** is redefined as **the point of view**, not an identity: the person behind the
  selected Profile — possibly a friend, not the tool's user. `player_color`, `result` and
  `opponent` stay Player-relative, which now means *relative to that Profile's Player*.
- `Game`, `Import`, `Analysis pass` and `Danger position` were amended to say which Profile they
  belong to.

### Schema (ADR-0014, ADR-0015)

- New **`profiles`** table: id, `platform` (`chesscom` for now, the carrier for US-12), `username`
  in chess.com's canonical casing, creation timestamp. **Unique on `(platform, username)`.**
- **`games`** gains a `NOT NULL profile_id`. Its uniqueness moves from `game_url` to
  **`(profile_id, game_url)`** — the same match under two Profiles is two rows, by design, and is
  **not** a dedup bug.
- **`move_habits`** gains `profile_id`, **inside its primary key** (`profile_id, fen, side, san`),
  so two Profiles' counters cannot collide.
- **`analysis_passes`** gains `profile_id`, so a pass is reported under the Profile it ran for.
- **`evaluations`** gains nothing — it hangs off `games` via `game_id` and is scoped transitively.
  The duplicated engine work this implies is accepted and tracked in ADR-0014; the FEN-keyed cache
  is the documented escape hatch, **not** in this PRD.
- **`settings`** is dropped, or emptied of its username key — it is unused (the table is empty in
  the real database) and `Profile` replaces its only purpose.

### Migration — the first deliverable

Per ADR-0015, the database is no longer throwaway. The migration is written **in the same slice**
as the schema it migrates, and runs: create `profiles`; insert `DudulSmash` (canonical casing
fetched from chess.com, or passed in if the call is refused); add `profile_id` **nullable** to
`games`, `move_habits`, `analysis_passes`; assign every existing row to that Profile; then tighten
to `NOT NULL` — **the tightening is the assertion**, so a half-assigned run fails rather than
completing quietly. Non-destructive and re-runnable. Verified against the user's real database
(166 Games, 20 analyzed, 1199 Evaluations, 5754 `move_habits` rows, 1 pass — all `DudulSmash`,
confirmed from the PGN headers).

### API

- New **`/api/profiles`**: list, create (validating against chess.com's public player endpoint and
  storing the canonical username), delete (cascading to the Profile's Games, Evaluations, habits
  and passes).
- Every scoped endpoint — `/api/games`, `/api/stats`, `/api/openings`, `/api/danger`,
  `/api/move-habits`, `/api/import`, `/api/analyze` — takes the **Profile explicitly as a
  parameter**. The server stays **stateless**: there is no "current profile" on the server, and a
  response is always the answer to a question that named its Profile.
- `/api/import` **loses its username input**: the account to fetch is the Profile's own.
- Requests naming no Profile, or an unknown one, are refused rather than silently answered over
  all rows.

### Client

- The current Profile is held **client-side** and persisted locally. It is sent on every API call.
- **`/profiles`** (list, create, select) and **`/profiles/:id`** (one Profile: counters, Import,
  analysis state, deletion). The top-level `/import` route is removed.
- `/profiles/:id` is the **only** route carrying an id. The analysis pages stay scoped by the
  current selection — deliberately asymmetric: on a Profile's page you act *on* a named Profile,
  elsewhere you read *the* current Profile's data.
- A **banner** on every scoped page names the current Profile and links to `/profiles`. It does not
  switch in place — selection lives on the dedicated page.
- No Profile selected on a scoped page -> **redirect to `/profiles`**. A Profile selected with no
  Games -> **empty state**, not a redirect.

### Rejected here, on purpose

- A `game_profiles` link table sharing one `Game` row across Profiles (ADR-0014).
- Sharing Evaluations across Profiles via a FEN-keyed cache (ADR-0014, escape hatch).
- Profile in the page URL for every view (Q5 — costs the ADR-0006 routing, buys a shareable link
  we do not need yet).
- Profile renaming — the username *is* the identity; a renamed account is delete + recreate.
- Any "legacy"/default Profile for unassigned rows — the migration assigns everything or fails.

## Testing Decisions

A good test here asserts **what the user can observe**: what an endpoint returns, what a page
shows, what survives a migration. It never asserts that a `WHERE profile_id = ?` was emitted —
that is the implementation of isolation, not isolation itself. The isolation property is best
stated as *"data created under Profile A is absent from every answer given about Profile B"*, and
that sentence is directly executable at the HTTP seam.

**Server, HTTP seam (`server/test/api.test.ts`, supertest on `createApp`, `:memory:` db).** The
highest existing server seam and the one that already covers import, analysis, danger and stats.
The scoping suite: create two Profiles, put Games under each, then assert every scoped endpoint
answers about one and never leaks the other. Plus: creation validates and canonicalises, duplicate
creation selects instead of duplicating, creation is refused when the platform is unreachable
(the existing `fakeClient` fixture covers this), an unknown/absent Profile is refused, import runs
under the Profile it was called for, the same `game_url` is accepted under two Profiles and
rejected twice under one, and deletion leaves nothing behind.

**Migration (new seam, prior art `server/test/db-open.test.ts`).** A **file** database — not
`:memory:`, which cannot be reopened — seeded with pre-Profile rows through **raw SQL**, since the
new schema no longer permits an insert without `profile_id`. Exactly the shape `db-open.test.ts`
uses for the FEN repair. Asserts: a Profile is created, **every** row of `games`, `move_habits`
and `analysis_passes` is assigned to it, no Evaluation is lost, and a second run changes nothing.
This is the test that stands between the user and their 1199 Evaluations; it is not optional.

**Client, page seam (RTL, `api` module mocked — prior art `GamesPage.test.tsx`,
`ImportForm.test.tsx`).** The profiles list and the Profile page render what the API returns;
creation surfaces its error; the banner names the current Profile; a scoped page with no selection
redirects while one with no Games shows the empty state; the import form has no username field and
passes the Profile through.

**Unit.** Nothing new is owed — the scoping is a property of queries, not of a new algorithm. The
existing win-rate, severity and winning-chances units are untouched.

**Agentic tier.**

Each slice carries its own executable **Feature Path** as the auto-merge gate: the migration slice
proves the real database upgrades with its analyses intact; the profiles-area slice proves a
Profile can be created, selected and deleted; the scoping slice proves two Profiles side by side
never show each other's figures.

The **HP suite needs rework, and it is due, not optional.** All three HP begin by importing
through a route that no longer exists, and none of them creates a Profile. Two decisions:

- **A new bootstrap path (path 0)** — create the `DudulSmash` Profile and import the reference
  range, then snapshot the database. HP-01/02/03 restore that snapshot by file copy instead of
  re-importing. The suite README already codifies snapshotting as an economy rule; path 0 turns a
  repeated instruction into **one named, tested step**, so the real chess.com contract is exercised
  once per suite run rather than once per scenario.
- It **does not consume the 3-HP cap**: it is a prerequisite, not a journey of value. The cap
  protects against a sprawling suite of user journeys; a shared fixture-building step is not one.
  HP-01 keeps its own real-network import assertions (the incremental re-import, the per-month
  lines) — path 0 builds state, it does not take over what HP-01 is for.

**Sequencing constraint:** US-13 (stylesheet) is in flight in another agent's worktree and will
substantially rework the same three HP. The HP rewrite here **must be based on US-13's version**,
not on today's. See *Further Notes*.

## Out of Scope

- **US-12 (Lichess import).** The `platform` column exists and is the carrier, but only `chesscom`
  is implemented. No second import client, no platform picker beyond what one value requires.
- **Grouping several accounts under one person.** Explicitly deferred (ADR-0014): it would sit
  *above* Profiles and changes nothing about what a Profile is.
- **Sharing Evaluations across Profiles** (FEN-keyed cache). Documented escape hatch, not built.
- **Comparing two Profiles side by side.** One Profile is selected at a time; no comparison view.
- **Profile renaming.**
- **Backups.** ADR-0015 notes that a bad migration is unrecoverable and that migrations should be
  run against a copy first. That is a practice, not tooling built here.
- **Re-analysing anything.** The migration preserves Evaluations; it does not recompute them.

## Further Notes

**Do not start implementation until US-13 has landed.** The user's instruction. US-13 reworks the
visuals and will substantially rewrite the three HP; this story removes a route (`/import`), adds
two (`/profiles`, `/profiles/:id`) and adds a banner to every page. Both touch the same screens and
the same scenarios. Starting in parallel would guarantee a conflict on files where resolving means
choosing between two intents — exactly the case the git-flow skill says to hand back to a human.
The plan is therefore to **rebase this story's integration branch on US-13's outcome** and adjust
the two client-facing slices — the profiles area and the HP rewrite — to the new visual language
before writing them. The schema and migration slice is independent of US-13 and could in principle
go first, but the sequencing instruction is deliberate and holds for the whole story.

**The `settings` table is empty.** The "remembered username" feature that `Profile` supersedes
never worked in practice. Nothing to convert, only something to create — and worth knowing before
someone writes a migration path for data that does not exist.

**The duplication ADR-0014 accepts is real and tracked.** A Position recurring across one Profile's
Games is already re-evaluated per Game (pre-existing); a Game shared by two followed Profiles is
now analyzed twice (added here). The user asked explicitly to be able to revisit this. If it bites,
the fix is the FEN-keyed cache — additive, and it does not disturb the partitioning.
