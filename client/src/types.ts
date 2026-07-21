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
}

/** The scope of one Import: a single month and the wanted time control categories. */
export interface ImportParams {
  username: string;
  year: number;
  month: number;
  categories: TimeControlCategory[];
}

/** Outcome of an Import (the summary window in issue 03 enriches this). */
export interface ImportResult {
  imported: number;
  alreadyPresent: number;
  message?: string;
}
