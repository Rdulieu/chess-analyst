/** chess.com's own time control classification (see CONTEXT.md → Game). */
export type TimeControlCategory = "bullet" | "blitz" | "rapid" | "daily";

/** The `Game` glossary term as delivered by the local API. */
export interface Game {
  id: number;
  pgn: string;
  opponent: string;
  result: string;
  date: string;
  timeControlCategory: TimeControlCategory;
}
