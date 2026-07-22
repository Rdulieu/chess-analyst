# Navigation skeleton (client routing, one page per journey)

Status: ready-for-agent
Type: technical enabler (no business ref — infrastructure)
Decision: `docs/adr/0006-client-routing-page-per-journey.md`
Integration branch: `integration/nav-skeleton` → `develop` (then `integration/US-5-move-explorer` resyncs on `develop`)

## Problem Statement

The app began as a single flat page (`client/src/App.tsx`): the import form, the Game list and
the per-Game board all stacked on one screen, with the current selection held in local component
state. That was fine for one journey. It no longer is: the product now has several distinct
journeys that don't belong on the same screen — importing and listing Games, reviewing a single
Game on the board, and (next) the `Move habit` explorer (US-5), later `Weak opening` (US-3),
`Danger position` (US-4) and a global stats view (US-6). Stacking them conflates unrelated
intentions, offers no way to link to or reload a specific view, and gets steadily worse as each
new explorer is added.

## Solution

Introduce **client-side routing** and split the app into **one page per journey**, served behind
a router shell with a navigation menu. The monolithic `App.tsx` becomes a router shell + nav; its
current inline flow is decomposed into page components, and the interactive `Board` is extracted
into a reusable component so the upcoming explorer can reuse it. This enabler ships only the
routing shell plus the pages that already have content (Mes parties, Analyse) and reserves the
routes the feature US will fill (`/explorer` → US-5, `/stats` → US-6). It is delivered on its own
integration branch, before US-5's feature issues, and is reused later by US-3/US-4/US-6.

## User Stories

1. As the Player, I want the app organised into distinct pages I can navigate between, so that each activity (importing, reviewing a Game, exploring) has its own screen instead of everything stacked on one.
2. As the Player, I want a navigation menu, so that I can move between the app's sections directly.
3. As the Player, I want the landing page (`/`) to show the import form and my Game list, so that importing and browsing my history stay where I expect them.
4. As the Player, I want selecting a Game in the list to take me to a dedicated review page (`/analyse/:gameId`), so that reviewing one Game is a focused screen rather than a panel appended below the list.
5. As the Player, I want the review page to show the interactive board with Previous / Next / jump-to-Move on the selected Game, exactly as before, so that no reviewing capability is lost in the reorganisation.
6. As the Player, I want each page to have its own address, so that I can reload or link straight to a specific view without losing my place.
7. As the Player, I want a `/stats` entry reserved in the navigation, so that the global stats view (US-6) has a home once built; for now it shows a placeholder.
8. As a developer picking up US-5, I want the `/explorer` route to be mine to add, so that the explorer's route, nav entry and page content stay owned by US-5 rather than pre-baked into the infrastructure.
9. As a developer, I want the interactive board extracted into a reusable component, so that the Analyse page and the future explorer render the same board without duplicating it.
10. As a developer, I want `App.tsx` reduced to a router shell + navigation, so that adding a future explorer means adding a route and a page, not editing a growing monolith.
11. As a developer, I want the server left untouched, so that this is a purely client-side reorganisation with no API or persistence change.
12. As a developer, I want the existing app-level integration test updated to drive the routed app, so that navigation and page rendering are guarded at the highest existing seam.

## Implementation Decisions

- **Router**: add `react-router-dom` and use `BrowserRouter` (Vite's dev server handles the history fallback in development). Chosen over a full app framework (overkill for a local, single-user, offline tool — ADR-0002) and over in-page view toggling (no deep-linking, conflates journeys). See ADR-0006.
- **Routes**:
  - `/` — **Mes parties**: import form + Game list (extracted from `App.tsx`). Selecting a Game navigates to its Analyse page.
  - `/analyse/:gameId` — **Analyse**: reviewing one Game on the board (the current per-Game viewer/navigation, extracted). The page reads the Game id from the route and loads that Game.
  - `/explorer` — **NOT delivered here**: route, nav entry and page content are owned by US-5.
  - `/stats` — **placeholder shell** delivered here; its content (global stats over all imported Games) is owned by US-6.
- **Navigation**: a nav component with entries **Mes parties** and **Stats**. **Explorateur** is added by US-5. **Analyse** is reached by selecting a Game (not a top-level nav entry, since it is Game-scoped).
- **Decomposition**: `App.tsx` becomes a router shell + nav, not a feature host. The Game list and the per-Game Analyse view become separate pages. The interactive `Board` is extracted as a **reusable component** shared by Analyse and (later) the explorer. Consistent with the feature-independence practice.
- **Behaviour change**: selecting a Game becomes a **navigation** to `/analyse/:gameId`, not an in-page state change. This changes a behaviour delivered by US-1/US-2 and requires a wording adjustment to **HP-01** (`docs/test-scenarios/HP-01-import-and-explore.md`): "open a Game" is now a navigation to the Analyse page.
- **Server**: untouched. Routing is entirely client-side; no API contract or schema change.
- **Fixture for FP**: the FP needs a deterministic, offline Game to select without hitting the network. Reuse an existing local/fixture Game seed (as US-1 used a fixture Game) so the FP never depends on chess.com.

## Testing Decisions

Tests assert observable behaviour (which page renders, what is navigable) — not router internals
or component wiring.

- **App-level integration (primary seam, existing)**: render the routed `App` in jsdom with
  Testing Library + `user-event`, driving routes via `MemoryRouter` (`initialEntries`) — the same
  seam as today's `client/test/App.test.tsx`, which is **updated** to reflect routing. Assert: the
  nav renders; `/` shows the import form + Game list; selecting a Game navigates to
  `/analyse/:gameId` and the board renders with working Previous/Next; `/stats` shows the
  placeholder; navigating back returns to Mes parties. Prior art: the current `App.test.tsx` and
  `ImportSummary.test.tsx`.
- **`Board` component test unchanged**: `Board`'s `{ pgn }` interface does not change on
  extraction, so `client/test/Board.test.tsx` stays valid and guards that the extraction didn't
  break stepping/jumping. No new isolated route-unit tests — the App seam covers routing.
- **Test pyramid apex — Feature Path (FP, agentic, offline)**: a subagent launches the app seeded
  with a fixture Game (no network), confirms the nav is visible, selects the seeded Game in the
  list → lands on `/analyse/:gameId` with the board rendered and Previous/Next working, navigates
  to `/stats` → sees the placeholder, and returns to Mes parties. This FP is the sub-issue →
  `integration/nav-skeleton` auto-merge gate.
- **No new HP for this enabler**: it is infrastructure. The existing HP-01 (adjusted for the
  navigation change) continues to exercise the real import → review-a-Game journey end to end.

## Out of Scope

- The `/explorer` route, nav entry and page content — owned by **US-5**.
- The `/stats` page content (global stats over all imported Games) — owned by **US-6**; only the placeholder shell is delivered here.
- `Weak opening` (US-3) and `Danger position` (US-4) routes — added by their own US.
- Any server, API or schema change — routing is client-only.
- Encoding an explorer drill-down path in the URL — a possible later refinement, not this enabler.

## Further Notes

- Delivered on `integration/nav-skeleton` → `develop` (human merge), then `integration/US-5-move-explorer` resyncs on `develop` to build the explorer on top.
- Likely a single tracer-bullet issue (router + the two real pages + nav + `/stats` placeholder + `Board` extraction + updated `App.test.tsx`); `/to-issues` may split it if it proves too large.
- The HP-01 wording adjustment ("open a Game" becomes a navigation) travels with this enabler.
