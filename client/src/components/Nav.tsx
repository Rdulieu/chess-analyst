import { NavLink } from "react-router-dom";

/**
 * Top-level navigation between the app's journeys. Analyse is reached by
 * selecting a Game, not from here, since it is Game-scoped.
 */
export function Nav() {
  return (
    <nav aria-label="main">
      <ul>
        <li>
          <NavLink to="/">Mes parties</NavLink>
        </li>
        <li>
          <NavLink to="/explorer">Explorateur</NavLink>
        </li>
        <li>
          <NavLink to="/openings">Ouvertures</NavLink>
        </li>
        <li>
          <NavLink to="/danger">Positions dangereuses</NavLink>
        </li>
        <li>
          <NavLink to="/stats">Stats</NavLink>
        </li>
      </ul>
    </nav>
  );
}
