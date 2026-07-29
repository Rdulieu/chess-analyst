import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GameViewer } from "../src/features/games/GameViewer";
import { OPERA_GAME } from "./fixtures";
import type { MoveAnnotation } from "../src/types";

function stubAnnotations(plies: MoveAnnotation[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ analyzed: true, plies }) }) as Response),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("GameViewer", () => {
  it("fetches and shows annotations for an analyzed Game", async () => {
    stubAnnotations([
      { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null },
      { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder" },
    ]);

    render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);

    const items = await screen.findAllByRole("listitem");
    expect(items[0].textContent).toContain("??");
    expect(items[0].textContent).toContain("-4.0");
  });

  it("hides every glyph and Evaluation once the toggle is switched off", async () => {
    stubAnnotations([
      { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null },
      { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder" },
    ]);
    const user = userEvent.setup();
    render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);
    await screen.findByText(/-4\.0/);

    await user.click(screen.getByRole("checkbox", { name: /afficher les annotations/i }));

    const items = screen.getAllByRole("listitem");
    expect(items[0].textContent).not.toContain("??");
    expect(items[0].textContent).not.toContain("-4.0");
  });

  it("does not fetch annotations, and shows no toggle, for a not-yet-analyzed Game", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} />);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("checkbox", { name: /afficher les annotations/i })).toBeNull();
  });
});
