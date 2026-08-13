import { gameHeaders } from "../../chess/history";
import type { Game, TimeControlCategory } from "../../types";

/** One side of a Game, as the header presents it. */
export interface HeaderSide {
  color: "white" | "black";
  /** The name the PGN carries, or the stored opponent as a fallback; null when neither names them. */
  name: string | null;
  /** Whether this side is the Player's (CONTEXT.md → Player). */
  isPlayer: boolean;
}

/** Everything the Analyse page states about a Game, above its board. */
export interface GameHeaderModel {
  /** Always White first, then Black — the order a game sheet reads in. */
  sides: [HeaderSide, HeaderSide];
  /** Kept as stored: **relative to the Player** (CONTEXT.md → Game), never a symmetric score. */
  result: Game["result"];
  date: string;
  timeControlCategory: TimeControlCategory;
  /** The `Opening`, or null for a Game the platform did not classify (the **Other** bucket). */
  opening: { eco: string; name: string } | null;
}

/**
 * What the Analyse page says about a Game (US-10a). Locale-free on purpose:
 * the wording belongs to the component, the derivation belongs here.
 *
 * Names come from the PGN's tags — one source, consistent with the board by
 * construction. The Game's stored side is used **only** to mark which of the
 * two is the Player; the stored opponent serves as a fallback for a PGN that
 * names nobody.
 */
export function gameHeader(game: Game): GameHeaderModel {
  const named = gameHeaders(game.pgn);
  const side = (color: "white" | "black"): HeaderSide => {
    const isPlayer = game.playerColor === color;
    return { color, name: named[color] ?? (isPlayer ? null : game.opponent), isPlayer };
  };

  return {
    sides: [side("white"), side("black")],
    result: game.result,
    date: game.date,
    timeControlCategory: game.timeControlCategory,
    // Half a classification is not one — ECO without a name would render as a bare code.
    opening: game.eco && game.openingName ? { eco: game.eco, name: game.openingName } : null,
  };
}
