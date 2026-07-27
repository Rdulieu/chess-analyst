import type { Db } from "../db";
import { games, evaluations, type NewGame } from "../db/schema";

/**
 * Deterministic `Danger position` fixture (ADR-0009): Games with **pre-stored
 * per-ply `Evaluation`s** — no engine involved, mirroring how the other
 * explorers' fixtures (`Weak opening`, `Move habit`) feed their Feature Path
 * offline. Covers the three shapes the `/danger` page must render, plus a
 * transposition:
 *
 * - **"After 1. e4 e5"** (reached by A/B/C, 3 Games, 1 diverging by move 2):
 *   one blunder among three reaches → **~33%**, below the highlight threshold.
 * - **"After 1. d4 d5"** (reached by D/E, 2 Games): a blunder in both →
 *   **100%**, highlighted (≥50%).
 * - **The Position before 3. Nc3** (F/G, reached via two different move
 *   orders — **the transposition** — merging into one entry): no serious
 *   error in either → **0%**, the "nothing to see here" case.
 */
export function seedDangerFixture(db: Db): void {
  for (const { game, evals } of DANGER_FIXTURE_GAMES) {
    const { id } = db.insert(games).values(game).returning({ id: games.id }).get();
    db.insert(evaluations)
      .values(evals.map(([ply, cp]) => ({ gameId: id, ply, cp })))
      .run();
  }
}

interface FixtureGame {
  game: NewGame;
  /** `[ply, cp]` pairs — one per Position reached in the Game's PGN. */
  evals: [number, number][];
}

function fixtureGame(ref: string, pgn: string, playerColor: NewGame["playerColor"]): NewGame {
  return {
    gameUrl: `fixture://danger/${ref}`,
    pgn,
    opponent: `opponent-${ref}`,
    playerColor,
    result: "win",
    date: "2026-01-01",
    timeControlCategory: "blitz",
    analyzed: true,
  };
}

const DANGER_FIXTURE_GAMES: FixtureGame[] = [
  // A: blunders right after "1. e4 e5" (2. Nf3??).
  {
    game: fixtureGame("a", "1. e4 e5 2. Nf3 Nc6", "white"),
    evals: [[0, 0], [1, 0], [2, 0], [3, 1000], [4, 0]],
  },
  // B: same opening, no blunder.
  {
    game: fixtureGame("b", "1. e4 e5 2. Nf3 Nc6", "white"),
    evals: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  },
  // C: diverges at move 2, still reaches "after 1. e4 e5"; no blunder.
  {
    game: fixtureGame("c", "1. e4 e5 2. Bc4 Bc5", "white"),
    evals: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  },
  // D: blunders right after "1. d4 d5" (2. c4??).
  {
    game: fixtureGame("d", "1. d4 d5 2. c4 dxc4", "white"),
    evals: [[0, 0], [1, 0], [2, 0], [3, 1000], [4, 0]],
  },
  // E: same opening, also blunders (2. Nf3??) — 100% for this Position.
  {
    game: fixtureGame("e", "1. d4 d5 2. Nf3 Nf6", "white"),
    evals: [[0, 0], [1, 0], [2, 0], [3, 1000], [4, 0]],
  },
  // F/G: the transposition — same Position before 3. Nc3, different move order, no blunder.
  {
    game: fixtureGame("f", "1. d4 Nf6 2. c4 e6 3. Nc3", "black"),
    evals: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]],
  },
  {
    game: fixtureGame("g", "1. c4 e6 2. d4 Nf6 3. Nc3", "black"),
    evals: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]],
  },
];
