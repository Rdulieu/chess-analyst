import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { Profile } from "../../types";
import { useCurrentProfile } from "./CurrentProfileContext";

/**
 * The gate every analysis screen sits behind: a scoped page is **about one
 * `Profile`**, so it is only ever rendered once there is one, and it receives it
 * as a parameter — the client half of ADR-0014's explicit scoping.
 *
 * With nothing selected the Player is sent to `/profiles`: one door in, never an
 * unexplained blank screen. That is deliberately *not* what happens when the
 * selected Profile simply has no Game yet — the page owns that empty state, and
 * redirecting there would send the Player in circles about a problem they do not
 * have.
 */
export function ScopedPage({ children }: { children: (profile: Profile) => ReactNode }) {
  const current = useCurrentProfile();

  if (current.state === "none") return <Navigate to="/profiles" replace />;

  // Short enough that a spinner would flash and read as a glitch; announced
  // rather than merely drawn.
  if (current.state === "loading") return <p role="status">Chargement du profil…</p>;

  if (current.state === "failed") {
    return (
      <div role="alert">
        <p>Erreur : impossible de charger le profil courant ({current.error}).</p>
        <button type="button" onClick={current.retry}>
          Réessayer
        </button>
      </div>
    );
  }

  return <>{children(current.profile)}</>;
}
