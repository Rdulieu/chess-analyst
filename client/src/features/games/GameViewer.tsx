import { Board } from "../../components/Board";
import type { Game } from "../../types";

/** Shows one selected Game on the interactive board. */
export function GameViewer({ game }: { game: Game }) {
  return (
    <div style={{ maxWidth: 480 }}>
      <Board pgn={game.pgn} />
    </div>
  );
}
