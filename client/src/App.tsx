import { Routes, Route } from "react-router-dom";
import { Nav } from "./components/Nav";
import { GamesPage } from "./pages/GamesPage";
import { AnalysePage } from "./pages/AnalysePage";
import { ExplorerPage } from "./pages/ExplorerPage";
import { OpeningsPage } from "./pages/OpeningsPage";
import { DangerPage } from "./pages/DangerPage";
import { StatsPage } from "./pages/StatsPage";

/**
 * Router shell: app-level chrome (title + navigation) plus the route table.
 * One page per journey (ADR-0006). Each feature owns its own route/page —
 * this shell only wires the pages that already have content.
 */
export function App() {
  return (
    <>
      <header>
        <h1>chess-analyst</h1>
        <Nav />
      </header>
      <main>
        <Routes>
          <Route path="/" element={<GamesPage />} />
          <Route path="/analyse/:gameId" element={<AnalysePage />} />
          <Route path="/explorer" element={<ExplorerPage />} />
          <Route path="/openings" element={<OpeningsPage />} />
          <Route path="/danger" element={<DangerPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </main>
    </>
  );
}
