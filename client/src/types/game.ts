/**
 * The pace of play a Game was played at (CONTEXT.md → `Time control category`).
 * **Ours, five values** — not any one Platform's: `classical` has its own bucket
 * rather than being averaged into `rapid`, and `correspondence` is the game's
 * own word for what chess.com calls "daily".
 */
export type TimeControlCategory =
  | "bullet"
  | "blitz"
  | "rapid"
  | "classical"
  | "correspondence";

/** The five categories, in increasing order of time per move. */
export const TIME_CONTROL_CATEGORIES: TimeControlCategory[] = [
  "bullet",
  "blitz",
  "rapid",
  "classical",
  "correspondence",
];

/** How a category is named on screen. */
export const CADENCE_LABEL: Record<TimeControlCategory, string> = {
  bullet: "Bullet",
  blitz: "Blitz",
  rapid: "Rapid",
  classical: "Classical",
  correspondence: "Correspondance",
};

/** The `Game` glossary term as delivered by the local API (Player-relative). */
export interface Game {
  id: number;
  /**
   * The `Profile` this Game belongs to (ADR-0014). Carried by the Game itself,
   * which is what lets a screen reached by direct URL — the Analyse page — start
   * an `Analysis pass` for the right Player without a current Profile to lean on.
   */
  profileId: number;
  gameUrl: string;
  pgn: string;
  opponent: string;
  playerColor: "white" | "black";
  result: "win" | "loss" | "draw";
  date: string;
  timeControlCategory: TimeControlCategory;
  /**
   * The `Opening`'s ECO code and name, from the platform's own classification
   * (ADR-0007), stored at Import. Both null for a Game it did not classify —
   * the **Other** bucket (CONTEXT.md → Opening).
   */
  eco: string | null;
  openingName: string | null;
  /** Whether this Game has been through the engine analysis pass (US-4). */
  analyzed: boolean;
}
