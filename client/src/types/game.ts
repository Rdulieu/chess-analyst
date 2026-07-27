/** chess.com's own time control classification (see CONTEXT.md → Game). */
export type TimeControlCategory = "bullet" | "blitz" | "rapid" | "daily";

/** The `Game` glossary term as delivered by the local API (Player-relative). */
export interface Game {
  id: number;
  gameUrl: string;
  pgn: string;
  opponent: string;
  playerColor: "white" | "black";
  result: "win" | "loss" | "draw";
  date: string;
  timeControlCategory: TimeControlCategory;
  /** Whether this Game has been through the engine analysis pass (US-4). */
  analyzed: boolean;
}
