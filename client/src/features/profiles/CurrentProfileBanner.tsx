import { Link } from "react-router-dom";
import type { Profile } from "../../types";

/**
 * The permanent band naming whose figures are on screen. It belongs to the app
 * **chrome**, beside the navigation, not to any page: every scoped screen is
 * about a `Profile`, and none of them says which on its own — `/danger` and
 * `/openings` look identical whoever the Player is.
 *
 * It leads to `/profiles` and does **not** switch in place: selection lives on
 * the dedicated page (PRD, *Client*), so the one place a Profile changes stays
 * the one place a Profile changes.
 *
 * The name is spelled out, in words: "Profil courant" is the cue, not a tint —
 * US-13's rule that a current state is never told by colour alone.
 */
export function CurrentProfileBanner({ profile }: { profile: Profile }) {
  return (
    <aside aria-label="profil courant" data-banner="profile">
      <span data-part="label">Profil courant :</span>{" "}
      <Link to="/profiles">
        <strong>{profile.username}</strong>
      </Link>{" "}
      <span data-part="platform">(chess.com)</span>
    </aside>
  );
}
