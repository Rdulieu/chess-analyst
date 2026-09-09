import { gameHeaders } from "../../chess/history";
import type { Game, TimeControl, TimeControlCategory } from "../../types";

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

/**
 * How an exact `Time control` is **said** on screen, or `null` when the Game
 * declares none — and `null` is rendered as words by the component, never as a
 * `0` or a blank (US-15b: the Player must never read a zero where the app has
 * no figure).
 *
 * Only the wording lives here. Translating the two Platforms' four spellings
 * into this shape is the server's single named function (ADR-0029): keeping the
 * two apart is what stops a fifth spelling being half-handled on this side.
 */
export function timeControlLabel(control: TimeControl | null): string | null {
  if (control === null) return null;
  if (control.kind === "correspondence") {
    // The number agrees, because "1 jours par coup" reads as a bug in the app
    // rather than as a cadence.
    return `${control.daysPerMove} jour${control.daysPerMove > 1 ? "s" : ""} par coup`;
  }
  return `${budget(control.initialCs)}+${control.incrementCs / 100}`;
}

/**
 * The initial budget, in the shortest form that stays exact: whole minutes as a
 * bare number (`3`, `5`, `10` — the way both Platforms name their cadences), and
 * `m:ss` when the budget is not a round minute, which a 90-second bullet Game
 * is. Never a fraction: `1.5+1` is not how anyone spells a time control.
 */
function budget(initialCs: number): string {
  const seconds = initialCs / 100;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (rest === 0) return String(minutes);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
