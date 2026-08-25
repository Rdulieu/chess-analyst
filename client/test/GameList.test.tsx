import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { GameList } from "../src/features/games/GameList";
import type { Game } from "../src/types";

function game(over: Partial<Game>): Game {
  return {
    id: 1,
    profileId: 1,
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

  it("lets the table scroll inside its own container, never the page", () => {
    render(
      <GameList
        games={[game({ id: 1 })]}
        onSelect={noop}
        selectedIds={new Set()}
        onToggleSelect={noop}
      />,
    );

    // Six columns of `nowrap` cells outgrow a narrow content column, and when
    // they do it must be the CONTAINER that scrolls. Left to the page, the whole
    // document scrolled sideways at 900px and the table overhung its column by
    // 130px at 1440px — measured on the running app, invisible to jsdom.
    //
    // The container wraps the table HERE and not in the page, unlike /stats and
    // /openings whose tables are built inline in their page: this table belongs
    // to the component, so the guarantee travels with it and no future caller
    // can forget it.
    const table = screen.getByRole("table", { name: /parties/i });
    expect(table.parentElement?.dataset.scroll).toBe("x");
  });

  it("is a table whose header row names the columns", () => {
    render(
      <GameList
        games={[game({ id: 1 })]}
        onSelect={noop}
        selectedIds={new Set()}
        onToggleSelect={noop}
      />,
    );

    const table = screen.getByRole("table", { name: /parties/i });
    const headers = within(table).getAllByRole("columnheader");

    // Six columns: the selection, then one per fact the Player sweeps down.
    // The leading one is deliberately unnamed — every checkbox already says
    // which Game it selects, so a header word there would only repeat it.
    expect(headers.map((h) => h.textContent?.trim())).toEqual([
      "",
      "Date",
      "Adversaire",
      "Résultat",
      "Cadence",
      "État",
      // The Player's own reading, beside the engine's state and never merged
      // into it: one is the machine's work, the other is theirs (US-16a).
      "Lecture",
    ]);
  });

  it("shows an 'analysée' badge only on analyzed Games", () => {
    render(
      <GameList
        games={[game({ id: 1, opponent: "a", analyzed: true }), game({ id: 2, opponent: "b", analyzed: false })]}
        onSelect={noop}
        selectedIds={new Set()}
        onToggleSelect={noop}
      />,
    );

    // Read from the État cell of each row, not from the row at large: the badge
    // belongs to one column, which is what lets the Player sweep it.
    const [first, second] = screen.getAllByRole("row").slice(1);
    expect(within(within(first).getAllByRole("cell")[5]).queryByLabelText(/analysée/i)).toBeTruthy();
    expect(within(within(second).getAllByRole("cell")[5]).queryByLabelText(/analysée/i)).toBeNull();
  });

  it("gives each Game one row, with one fact per cell", () => {
    render(
      <GameList
        games={[game({ id: 1, opponent: "Alice", result: "loss", date: "2026-05-17", timeControlCategory: "rapid" })]}
        onSelect={noop}
        selectedIds={new Set()}
        onToggleSelect={noop}
      />,
    );

    const [row] = within(screen.getByRole("table", { name: /parties/i }).querySelector("tbody")!).getAllByRole("row");
    const cells = within(row).getAllByRole("cell");

    // One fact per cell, in the order the headers announced. The result and the
    // cadence are read in WORDS, not in the API's own vocabulary: `loss` and
    // `rapid` are how the Game is stored, never how it is read.
    expect(cells).toHaveLength(7);
    expect(cells[1].textContent).toBe("2026-05-17");
    expect(cells[2].textContent).toBe("Alice");
    expect(cells[3].textContent).toBe("Défaite");
    expect(cells[4].textContent).toBe("Rapid");
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
    // reinforces them.
    expect(badge.textContent?.trim()).toMatch(/✓/);
    expect(badge.textContent?.trim()).toMatch(/analysée/i);
    // And the pill's tint, ink and border now come from the stylesheet, so no
    // colour is left hard-coded on the element.
    expect(badge.getAttribute("style")).toBeNull();
  });

  it("opens the Game from its opponent cell", async () => {
    const onSelect = vi.fn();
    const alice = game({ id: 42, opponent: "Alice" });
    render(
      <GameList games={[alice]} onSelect={onSelect} selectedIds={new Set()} onToggleSelect={noop} />,
    );

    const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
    // The opponent is the row's target, and it is the ONLY one: a whole row of
    // clickable cells reads as a wall of buttons, and the date or the cadence
    // are facts to compare, not doors to walk through.
    const opener = within(cells[2]).getByRole("button", { name: "Alice" });
    expect(within(cells[1]).queryByRole("button")).toBeNull();

    await userEvent.click(opener);

    expect(onSelect).toHaveBeenCalledWith(alice);
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
