import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { GameList } from "../src/features/games/GameList";
import type { Game } from "../src/types";

function game(over: Partial<Game>): Game {
  return {
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
  };
}

const noop = () => {};

describe("GameList", () => {
  it("shows an 'analysée' badge only on analyzed Games", () => {
    render(
      <GameList
        games={[game({ id: 1, opponent: "a", analyzed: true }), game({ id: 2, opponent: "b", analyzed: false })]}
        onSelect={noop}
        selectedIds={new Set()}
        onToggleSelect={noop}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).queryByLabelText(/analysée/i)).toBeTruthy();
    expect(within(items[1]).queryByLabelText(/analysée/i)).toBeNull();
  });

  it("lets the Player select a Game via its checkbox", async () => {
    const onToggleSelect = vi.fn();
    render(
      <GameList
        games={[game({ id: 7, opponent: "z" })]}
        onSelect={noop}
        selectedIds={new Set()}
        onToggleSelect={onToggleSelect}
      />,
    );

    await userEvent.click(screen.getByRole("checkbox"));

    expect(onToggleSelect).toHaveBeenCalledWith(7);
  });
});
