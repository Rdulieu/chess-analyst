import { Routes, Route, useLocation } from "react-router-dom";
import { Nav } from "./components/Nav";
import { GamesPage } from "./pages/GamesPage";
import { ProfilesPage } from "./pages/ProfilesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AnalysePage } from "./pages/AnalysePage";
import { ReadingPage } from "./pages/ReadingPage";
import { ExplorerPage } from "./pages/ExplorerPage";
import { OpeningsPage } from "./pages/OpeningsPage";
import { DangerPage } from "./pages/DangerPage";
import { StatsPage } from "./pages/StatsPage";
import {
  CurrentProfileProvider,
  useCurrentProfile,
} from "./features/profiles/CurrentProfileContext";
import { CurrentProfileBanner } from "./features/profiles/CurrentProfileBanner";
import { ScopedPage } from "./features/profiles/ScopedPage";

/**
 * Router shell: app-level chrome (title, navigation, and the banner naming the
 * current `Profile`) plus the route table. One page per journey (ADR-0006).
 *
 * Every analysis route sits behind `ScopedPage`: it is about **one Profile**,
 * receives it as a parameter (ADR-0014), and with none selected it sends the
 * Player to `/profiles` rather than rendering a screen about nobody. The
 * profiles area itself is not scoped — it is where a Profile is chosen.
 */
export function App() {
  return (
    <CurrentProfileProvider>
      <Shell />
    </CurrentProfileProvider>
  );
}

function Shell() {
  const current = useCurrentProfile();
  const { pathname } = useLocation();
  // Not on the profiles area: there the Profile is what the page is *about*,
  // and a banner pointing at the page you are on says nothing.
  const inProfilesArea = pathname.startsWith("/profiles");

  return (
    <>
      {/* The header spans the window; its contents sit in the same column as the
          content below, so the chrome lines up with the page rather than running
          edge to edge. Same wrapper on both sides — one alignment, one place. */}
      <header>
        <div data-column>
          <h1>chess-analyst</h1>
          <Nav />
        </div>
        {current.state === "ready" && !inProfilesArea && (
          <div data-column>
            <CurrentProfileBanner profile={current.profile} />
          </div>
        )}
      </header>
      <main>
        <div data-column>
          <Routes>
            <Route
              path="/"
              element={<ScopedPage>{(profile) => <GamesPage profile={profile} />}</ScopedPage>}
            />
            {/* Not scoped: the route names one Game outright, and the Player
                reached it from a list that was already the right Profile's. */}
            <Route path="/analyse/:gameId" element={<AnalysePage />} />
            {/* Game-scoped for the same reason, and blind by nature: the Player's
                own reading of that Game (US-16a). Not in the `Nav` either. */}
            <Route path="/analyse/:gameId/lecture" element={<ReadingPage />} />
            <Route
              path="/explorer"
              element={<ScopedPage>{(profile) => <ExplorerPage profile={profile} />}</ScopedPage>}
            />
            <Route
              path="/openings"
              element={<ScopedPage>{(profile) => <OpeningsPage profile={profile} />}</ScopedPage>}
            />
            <Route
              path="/danger"
              element={<ScopedPage>{(profile) => <DangerPage profile={profile} />}</ScopedPage>}
            />
            <Route
              path="/stats"
              element={<ScopedPage>{(profile) => <StatsPage profile={profile} />}</ScopedPage>}
            />
            <Route path="/profiles" element={<ProfilesPage />} />
            {/* The only route carrying an id: here the Player acts ON a named
                Profile, everywhere else they read THE current one's data. */}
            <Route path="/profiles/:id" element={<ProfilePage />} />
          </Routes>
        </div>
      </main>
    </>
  );
}
