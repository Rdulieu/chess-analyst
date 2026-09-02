import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchGame, GameNotThisProfiles } from "../api";
import { GameViewer } from "../features/games/GameViewer";
import { ScopedPage } from "../features/profiles/ScopedPage";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { READING_STATE_LABEL } from "../types";
import type { Game, Profile, ReadingState } from "../types";

/**
 * Analyse (`/analyse/:gameId`): reviews one Game on the interactive board. The
 * Game id comes from the route, so the page is reachable by direct URL/reload —
 * it loads its own Game rather than relying on the list screen's state.
 */
export function AnalysePage() {
  return <ScopedPage>{(profile) => <AnalysisOfOneGame profile={profile} />}</ScopedPage>;
}

/**
 * Scoped like the reading route beside it (ADR-0014). It was not, and a Game
 * reached by id alone was drawn to whoever was selected — one Player's Game
 * under another's name, with nothing on screen saying so. `ReadingPage` had to
 * work around that: it withheld the link back here, precisely because this
 * screen would have shown the Game it had just refused. It no longer has to.
 */
function AnalysisOfOneGame({ profile }: { profile: Profile }) {
  const { gameId } = useParams();
  const [game, setGame] = useState<Game | null>(null);
  // Told apart on purpose: a Game that is not this Profile's is a **fact** the
  // Player is owed in words, while a load that failed is a malfunction. Folding
  // both into `game === null` would leave the screen on "Loading game…" for
  // ever — a refusal wearing the face of a hang.
  const [refused, setRefused] = useState<"foreign" | "failed" | null>(null);

  const refresh = useCallback(async () => {
    if (!gameId) return;
    await fetchGame(Number(gameId), profile.id)
      .then((result) => {
        setGame(result);
        setRefused(null);
      })
      .catch((cause: Error) => {
        setGame(null);
        setRefused(cause instanceof GameNotThisProfiles ? "foreign" : "failed");
      });
  }, [gameId, profile.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (refused === "foreign")
    return (
      <p role="status">
        Cette partie n'appartient pas au profil courant : il n'y a pas d'analyse à en montrer ici.
      </p>
    );
  if (refused === "failed") return <p role="alert">Cette partie n'a pas pu être chargée.</p>;
  if (!game) return <p>Loading game…</p>;

  const reading: ReadingState = game.reading ?? "none";

  return (
    // Like every screen: one section, an accessible name and an `h2`. `wide`
    // because the board and its `Evaluation curve` are the densest thing the app
    // draws and would be cramped inside the reading column.
    <section aria-labelledby="analyse-heading" data-width="wide">
      <h2 id="analyse-heading">Analyse</h2>
      {/* The way into the Player's own reading of this Game, and where that
          reading stands (US-16a). Offered here because the reading route is
          Game-scoped: it is reached from a Game, never from the `Nav`. */}
      <p data-part="reading-entry">
        {/* An ACT, so it reads as one (US-23, D2) — and it stays an anchor, so
            middle-click, "open in a new tab" and the status bar keep working. */}
        <Link to={`/analyse/${game.id}/lecture`} data-action="">
          {READING_ENTRY[reading]}
        </Link>{" "}
        {/* The state in words beside the way in: "resume" and "see" are different
            invitations, and a Player who cannot tell a started reading from a
            sealed one does not know which they are about to do. */}
        <span data-reading={reading}>{READING_STATE_LABEL[reading]}</span>
      </p>
      {/* The `Confrontation` (US-16b), offered only once the reading is sealed —
          which is what makes sealing lead somewhere. Before the seal there is
          nothing fixed to confront, and offering it would invite the Player to
          discover a refusal rather than be told the order of the exercise. */}
      {reading === "sealed" && (
        <p data-part="confrontation-entry">
          <Link to={`/analyse/${game.id}/confrontation`} data-action="">
            Confronter ma lecture au moteur
          </Link>
        </p>
      )}
      <ErrorBoundary key={game.id}>
        <GameViewer game={game} onAnalyzed={refresh} />
      </ErrorBoundary>
    </section>
  );
}

/**
 * How the way in is named, per state. Three different invitations, because they
 * are three different acts: beginning a reading, coming back to an unfinished
 * one, and looking at one that is closed.
 */
const READING_ENTRY: Record<ReadingState, string> = {
  none: "Écrire ma lecture de cette partie",
  open: "Reprendre ma lecture de cette partie",
  sealed: "Voir ma lecture scellée de cette partie",
};
