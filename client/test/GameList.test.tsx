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
  eco: null,
  openingName: null,
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

  it("exposes each entry as three distinct parts, in the same order on every row", () => {
    render(
      <GameList
        games={[game({ id: 1, opponent: "a", analyzed: true }), game({ id: 2, opponent: "b" })]}
        onSelect={noop}
        selectedIds={new Set()}
        onToggleSelect={noop}
      />,
    );

    for (const item of screen.getAllByRole("listitem")) {
      const checkbox = within(item).getByRole("checkbox");
      const description = within(item).getByRole("button");

      // Three named parts, present on every row whether or not the Game has
      // been analysed, so the columns line up down the whole list.
      const parts = [...item.children].map((child) => (child as HTMLElement).dataset.part);
      expect(parts).toEqual(["selection", "description", "state"]);

      // Three parts side by side, never nested one inside another: what the
      // Player reads left to right is selection, then the Game, then its state.
      expect(checkbox.contains(description)).toBe(false);
      expect(description.contains(checkbox)).toBe(false);
      expect(checkbox.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      const badge = within(item).queryByLabelText(/analysée/i);
      if (badge) {
        expect(description.contains(badge)).toBe(false);
        expect(description.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
    }
  });

  it("carries a textual cue on the badge — colour alone is not a cue", () => {
    render(
      <GameList
        games={[game({ id: 1, analyzed: true })]}
        onSelect={noop}
        selectedIds={new Set()}
        onToggleSelect={noop}
      />,
    );

    const badge = screen.getByLabelText(/analysée/i);
    // The checkmark and the word are what carry the meaning; the tint only ever
    // reinforces them. Where the tint comes from (an inline style today, a token
    // once the stylesheet lands) is not this test's business.
    expect(badge.textContent?.trim()).toMatch(/✓/);
    expect(badge.textContent?.trim()).toMatch(/analysée/i);
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
