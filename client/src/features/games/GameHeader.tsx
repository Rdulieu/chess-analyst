import { gameHeader } from "./gameHeader";
import type { Game } from "../../types";

const COLOR_LABEL = { white: "Blancs", black: "Noirs" } as const;

const RESULT_LABEL = { win: "Victoire", loss: "Défaite", draw: "Nulle" } as const;

/**
 * States what Game is on screen, above its board (US-10a): both players with
 * their colour, which one is the Player, and the Game's result, date, cadence
 * and `Opening`.
 *
 * The Player's side is marked **in words** ("vous"), never by colour alone —
 * the app ships no stylesheet (US-13), so the emphasis here is inline and is
 * only ever a reinforcement of a cue that already reads as text.
 *
 * The result is stated from the Player's side, as everywhere else in the app,
 * rather than as a symmetric `1-0`: what is stored is Player-relative, and
 * making it symmetric only to re-attribute it on screen would lose that.
 */
export function GameHeader({ game }: { game: Game }) {
  const { sides, result, date, timeControlCategory, opening } = gameHeader(game);

  return (
    <section aria-label="partie">
      {/*
        Deliberately not a list. The app ships no stylesheet (US-13), so a bare
        `ul` here renders as bullets directly under the navigation's own `ul` and
        reads as two extra menu entries — seen on screen during this slice's
        Feature Path, invisible to every test below it.
      */}
      {sides.map((side) => (
        <p
          key={side.color}
          data-player={side.isPlayer ? "true" : undefined}
          style={side.isPlayer ? { fontWeight: "bold" } : undefined}
        >
          {COLOR_LABEL[side.color]} : {side.name ?? "joueur inconnu"}
          {side.isPlayer && ` (vous — ${RESULT_LABEL[result]})`}
        </p>
      ))}
      <p>
        {date} · {timeControlCategory} ·{" "}
        {opening ? `${opening.eco} — ${opening.name}` : "ouverture non classée"}
      </p>
    </section>
  );
}
