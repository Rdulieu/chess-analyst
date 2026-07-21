# The app is split into routed pages, one per journey, behind a client-side router

The app began (US-1) as a single flat page (`client/src/App.tsx`): the import form, the
game list and the per-game board all stacked on one screen, with selection held in local
component state. That was fine for one journey. It no longer is: the product now has several
distinct journeys that don't belong on the same screen — importing and listing Games,
**reviewing a single Game** on the board, the **`Move habit` explorer** (US-5), and later
`Weak opening` (US-3), `Danger position` (US-4) and a `Stats` view. Stacking them all conflates
unrelated intentions, gives no way to link to or reload a specific view, and grows unwieldy as
each new explorer is added.

We introduce **client-side routing** (`react-router-dom`) and split the app into **one page per
journey**, served behind a router shell with a navigation menu. The monolithic `App.tsx` is
broken into page components plus reusable components (notably the `Board`, shared between the
Analyse page and the Explorer page).

## Routes

- `/` — **Mes parties**: the import form + the Game list. Selecting a Game navigates to its Analyse page.
- `/analyse/:gameId` — **Analyse**: review one Game on the board (the current per-game viewer/navigation, extracted from the list screen).
- `/explorer` — **Explorateur**: the `Move habit` explorer (US-5) — side selector, board, candidate list, breadcrumb.
- `/stats` — **Stats**: a placeholder shell delivered by this enabler; its content (aggregate stats over **all** imported Games — game count and win/draw/loss tally) is owned by a separate small US (BACKLOG US-6), not the enabler.

Future explorers (`Weak opening`, `Danger position`) each add their own route rather than
another stacked panel. Consistent with the feature-independence practice, the enabler ships only
the routing shell plus the pages that already have content (Mes parties, Analyse); each feature
owns its own route and page content — US-5 adds `/explorer`, US-6 fills `/stats`.

## Considered options

- **Keep the flat single page, toggle views in local state**: no new dependency, but conflates distinct journeys on one screen, offers no deep-linking or reload-to-view, and gets steadily worse as explorers multiply. Rejected.
- **A full app framework (e.g. Next.js) with routing built in**: far more than a local, single-user, offline tool needs (ADR-0002); would drag in SSR/build concerns for no benefit. Rejected.
- **Client-side routing with `react-router-dom`, one page per journey (chosen)**: a small, standard dependency that matches the SPA the app already is; each journey gets an addressable, reloadable page and each future explorer is just a new route.

## Consequences

- Adds `react-router-dom` and turns `App.tsx` into a router shell + navigation, not a feature host.
- `App.tsx`'s current inline flow is decomposed: the Game list, the per-game Analyse view and the Explorer become separate pages; the `Board` is extracted as a **reusable component** shared by Analyse and Explorer. Consistent with the feature-independence practice (`[[feature-independent-functions]]` in project memory).
- Selecting a Game in the list becomes a **navigation** to `/analyse/:gameId`, not an in-page state change — the Analyse page reads the Game id from the route.
- This routing/navigation skeleton is **cross-cutting infrastructure**, not US-5 logic. It is delivered by a **dedicated technical enabler US, separate from US-5**, landing before US-5's feature issues; US-5 then only adds the `/explorer` page on top. (Mirrors US-2's `code-decomposition` technical slice.)
