## Status
done — auto-merged into `integration/nav-skeleton` (merge `5abeec3`). Green local check:
build + tests (server 29, client 35) + agentic Feature Path green (nav visible → select a
Game → `/analyse/:gameId` with steppable board → `/stats` placeholder → back to Mes parties),
no blocking finding.

## Parent

`.scratch/nav-skeleton/PRD.md`

## Integration branch

This sub-issue is implemented on the technical enabler integration branch
`integration/nav-skeleton` — branch from it and merge back into it, NOT `develop`. It
auto-merges into `integration/nav-skeleton` after a green local check (build + tests + green FP,
no blocking finding); the `integration/nav-skeleton -> develop` merge stays a human decision.

## What to build

Turn the flat single-page app into a **routed app with one page per journey**, behind a router
shell and a navigation menu. Introduce client-side routing (`react-router-dom`, `BrowserRouter`),
and decompose the current `App.tsx` (which stacks import form + Game list + per-Game board) into:

- **`/` — Mes parties**: the import form + the Game list. Selecting a Game **navigates** to that
  Game's Analyse page (it no longer renders a viewer inline on the same screen).
- **`/analyse/:gameId` — Analyse**: reviews one Game on the interactive board (the current
  per-Game viewer/navigation), reading the Game id from the route.
- **`/stats` — Stats**: a placeholder shell only (its content — global stats — belongs to US-6).

Extract the interactive **`Board` into a reusable component** so the Analyse page and the future
explorer share it. The navigation menu exposes **Mes parties** and **Stats** (Explorateur is
added later by US-5; Analyse is reached by selecting a Game, not from the nav). Update the
app-level integration test to drive the routed app. The **server is not touched** — this is a
purely client-side reorganisation, no API or schema change.

Also adjust **HP-01** (`docs/test-scenarios/HP-01-import-and-explore.md`): "open a Game" is now a
navigation to the Analyse page rather than an in-page panel.

## Acceptance criteria

- [ ] A navigation menu is present with entries for Mes parties and Stats
- [ ] The `/` route shows the import form and the Game list (behaviour preserved from before)
- [ ] Selecting a Game in the list navigates to `/analyse/:gameId` for that Game (a route change, not an in-page render)
- [ ] The Analyse page renders the interactive board for the routed Game, with Previous / Next and jump-to-Move working exactly as before
- [ ] The `/stats` route renders a placeholder (no stats content yet)
- [ ] Reloading or opening a route URL directly lands on the corresponding page
- [ ] The `Board` is a reusable component whose `{ pgn }` interface is unchanged (its existing component test still passes)
- [ ] No `/explorer` route or nav entry is added (owned by US-5); no `/stats` content is added (owned by US-6)
- [ ] The server (API, persistence) is unchanged
- [ ] The app-level integration test is updated to drive the routed app; HP-01's wording is adjusted for the navigation change

### Feature Path (FP)

1. Launch the app seeded with a fixture Game (offline, no network) → the navigation is visible (Mes parties, Stats), and the landing page shows the import form and the Game list.
2. Select the fixture Game in the list → the app navigates to that Game's Analyse page; the board renders and Previous / Next step through the Game's Moves.
3. Navigate to Stats → a placeholder is shown.
4. Navigate back to Mes parties → the Game list is shown again.

Verify: UI first — drive the navigation and the Game selection, and read what each page renders. No backing-store probe needed (client-only change).

## Blocked by

- None - can start immediately (branch `integration/nav-skeleton` is cut from up-to-date `develop`).
