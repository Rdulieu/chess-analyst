import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AnalyzedCount } from "../src/features/games/AnalyzedCount";
import type { Game } from "../src/types";

const game = (over: Partial<Game>): Game => ({
  id: 1,
  gameUrl: "u",
  pgn: "1. e4 e5",
  opponent: "opp",
  playerColor: "white",
  result: "win",
  date: "2026-01-01",
  timeControlCategory: "blitz",
  analyzed: false,
  ...over,
});

describe("AnalyzedCount", () => {
  it("states how many Games are analyzed out of the total", () => {
    render(
      <AnalyzedCount
        games={[
          game({ id: 1, analyzed: true }),
          game({ id: 2, analyzed: true }),
          game({ id: 3, analyzed: false }),
        ]}
      />,
    );

    expect(screen.getByText(/3 parties · 2 analysées/i)).toBeTruthy();
  });
});
