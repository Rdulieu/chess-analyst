import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchConfrontation,
  fetchGame,
  fetchGameAnnotations,
  fetchPersonalAnalysis,
  ConfrontationRefused,
  GameNotThisProfiles,
} from "../api";
import { ConfrontationBoard } from "../features/confrontation/ConfrontationBoard";
import { ConfrontationReadout } from "../features/confrontation/ConfrontationReadout";
import { UnscoredReadout } from "../features/confrontation/UnscoredReadout";
import { ScopedPage } from "../features/profiles/ScopedPage";
import { ErrorBoundary } from "../components/ErrorBoundary";
import type { Game, GameAnnotations, GameConfrontation, PersonalAnalysis, Profile } from "../types";

/**
 * The `Confrontation` route (`/analyse/:gameId/confrontation`): the Player's
 * sealed reading of one Game set against what the engine found (CONTEXT.md).
 *
 * **A route of its own, and not a panel on the reading route.** That route is
 * blind by nature and stays so — showing the engine there would destroy the one
 * thing it guarantees. It is also already the densest panel in the app, and a
 * block appearing with the current ply is exactly what makes it reflow.
 *
 * Behind `ScopedPage` like the reading itself (ADR-0014): a confrontation is one
 * Player's own work, and reaching this URL with another `Profile` in hand must
 * not show it.
 */
export function ConfrontationPage() {
  return <ScopedPage>{(profile) => <ConfrontationOfOneGame profile={profile} />}</ScopedPage>;
}

/** What the screen is showing: the confrontation, a named refusal, or neither yet. */
type State =
  | { status: "loading" }
  | { status: "ready"; confrontation: GameConfrontation; board: BoardRecords }
  | { status: "refused"; refusal: ConfrontationRefused }
  | { status: "absent" }
  | { status: "failed" };

/**
 * What the board needs beyond the `Confrontation` itself: the Game to walk, the
 * engine's per-Move annotations that carry the curve, and the Player's own
 * sealed reading, which is what paints the squares.
 *
 * Three further reads, and worth naming why. This screen used to talk to two
 * endpoints and no more, deliberately: it derives everything from records the
 * app already serves, and a silent extra fetch would mean a second derivation
 * of the method. These three are the same discipline, not an exception to it —
 * every one of them is a record already served to another screen, read as it
 * stands and re-derived nowhere.
 */
interface BoardRecords {
  game: Game;
  annotations: GameAnnotations;
  reading: PersonalAnalysis;
}

function ConfrontationOfOneGame({ profile }: { profile: Profile }) {
  const { gameId } = useParams();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (!gameId) return;
    let live = true;
    setState({ status: "loading" });
    // The Confrontation FIRST, and the rest only if it answers: its two refusals
    // are the whole point of this route, and fetching a Game to draw a board on
    // a screen that is about to refuse would draw the Game it just refused.
    fetchConfrontation(Number(gameId), profile.id)
      .then(async (confrontation) => {
        const [game, annotations, reading] = await Promise.all([
          fetchGame(Number(gameId), profile.id),
          fetchGameAnnotations(Number(gameId), profile.id),
          fetchPersonalAnalysis(Number(gameId), profile.id),
        ]);
        return { confrontation, board: { game, annotations, reading } };
      })
      .then(({ confrontation, board }) => live && setState({ status: "ready", confrontation, board }))
      .catch((error: unknown) => {
        if (!live) return;
        // A refusal is a business fact with something true to say, and it is not
        // the same screen as "this Game is not yours" or "the app is broken".
        if (error instanceof ConfrontationRefused) setState({ status: "refused", refusal: error });
        else if (error instanceof GameNotThisProfiles) setState({ status: "absent" });
        // A malfunction is NOT "this Game is not yours". Before the board there
        // was one call here and that fallback was true; now three more can fail,
        // and a 500 on the annotations would have this screen assert something
        // false about the Profile — on the one route whose whole value is that
        // its refusals are named.
        else setState({ status: "failed" });
      });
    return () => {
      live = false;
    };
  }, [gameId, profile.id]);

  const id = Number(gameId);

  return (
    <section aria-labelledby="confrontation-heading" data-width="wide">
      <h2 id="confrontation-heading">Ma lecture face au moteur</h2>
      <ErrorBoundary key={id}>
        {state.status === "loading" && <p>Chargement de la confrontation…</p>}
        {state.status === "absent" && (
          <p>Cette partie est introuvable pour le profil sélectionné.</p>
        )}
        {state.status === "failed" && (
          <p role="alert">La confrontation de cette partie n'a pas pu être chargée.</p>
        )}
        {state.status === "refused" && <Refusal refusal={state.refusal} gameId={id} />}
        {state.status === "ready" && (
          <>
            <Provenance confrontation={state.confrontation} />
            {/* The Moves, shown rather than imagined. Above the figures, because
                the figures are now a claim ABOUT what the board shows — and the
                Player who reads "1 sur 4" has to be able to go and look. */}
            <ConfrontationBoard
              game={state.board.game}
              annotations={state.board.annotations}
              reading={state.board.reading}
              moves={state.confrontation.moves}
            />
            <ConfrontationReadout confrontation={state.confrontation} />
            {/* Below the figures, because it is what explains them: the gap
                between what the Game shows and what the Player is held to. */}
            <UnscoredReadout confrontation={state.confrontation} />
            {/* The limit of the method, said in the product and not only in the
                docs: judging our own analysis by Player/engine agreement would
                assume the Player right, which is exactly what is not
                established. */}
            <p data-part="divergence-note">
              Là où votre lecture et le moteur se séparent, c'est une <strong>divergence</strong> :
              elle dit où regarder, pas qui se trompe.
            </p>
            <p>
              <Link to={`/analyse/${id}`} data-action="">
                Retour à l'analyse de cette partie
              </Link>
            </p>
          </>
        )}
      </ErrorBoundary>
    </section>
  );
}

/**
 * The refusal, with **the road out of it**. Printing the sentence alone would
 * leave the Player to work out where the missing act is performed — and the two
 * refusals are performed in two different places, which is the whole reason they
 * are told apart.
 */
function Refusal({ refusal, gameId }: { refusal: ConfrontationRefused; gameId: number }) {
  return (
    <div data-part="confrontation-refused" data-reason={refusal.reason}>
      <p>{refusal.message}</p>
      {refusal.reason === "not-sealed" ? (
        <p>
          <Link to={`/analyse/${gameId}/lecture`} data-action="">
            Reprendre ma lecture pour la sceller
          </Link>
        </p>
      ) : (
        <p>
          <Link to={`/analyse/${gameId}`}>Aller à l'analyse de cette partie</Link>
        </p>
      )}
    </div>
  );
}

/**
 * What this comparison is worth, before any figure is read: whether the engine
 * had already been shown for this Game when the reading was sealed, and under
 * which `Search regime` the engine's side was produced.
 *
 * Both are said in words, above the figures rather than under them. A comparison
 * with no provenance is not a comparison, and figures produced at an unstated
 * depth are an artefact of that depth.
 */
function Provenance({ confrontation }: { confrontation: GameConfrontation }) {
  const informed = confrontation.provenance === "informed";
  return (
    <div data-part="confrontation-provenance">
      <p>
        <strong>{informed ? "Lue informée" : "Lue à l'aveugle"}</strong> —{" "}
        {informed
          ? "l'analyse du moteur avait déjà été affichée pour cette partie avant le scellement."
          : "l'analyse du moteur n'avait pas été affichée pour cette partie avant le scellement."}{" "}
        Scellée le {new Date(confrontation.sealedAt).toLocaleString("fr-FR")}.
      </p>
      {confrontation.regime && (
        <p data-part="regime">
          Chiffres du moteur obtenus à <strong>profondeur {confrontation.regime.depth}</strong>,{" "}
          {confrontation.regime.lines} ligne{confrontation.regime.lines > 1 ? "s" : ""}.
        </p>
      )}
    </div>
  );
}
