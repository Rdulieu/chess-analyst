import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReanalyseAction } from "../src/features/analysis/ReanalyseAction";

const props = {
  gameName: "Morphy — Duke Karl (2026-06-04)",
  positions: 170,
  running: false,
  onAnalyze: () => {},
};

describe("Relaunching the analysis from the review", () => {
  it("offers the action on a Game that is ALREADY analysed — the screen used not to", async () => {
    render(<ReanalyseAction {...props} analyzed />);

    expect(screen.getByRole("button", { name: /réanalyser cette partie/i })).toBeTruthy();
  });

  it("warns before destroying anything, naming the Game, the loss and the cost", async () => {
    const user = userEvent.setup();
    render(<ReanalyseAction {...props} analyzed />);

    await user.click(screen.getByRole("button", { name: /réanalyser cette partie/i }));

    const warning = screen.getByRole("alertdialog", { name: /confirmer la réanalyse/i });
    expect(warning.textContent).toContain("Morphy — Duke Karl (2026-06-04)");
    expect(warning.textContent).toMatch(/écrasée/i);
    expect(warning.textContent).toMatch(/3 minutes/);
  });

  it("does not start a pass merely by asking: nothing runs until the Player confirms", async () => {
    const onAnalyze = vi.fn();
    const user = userEvent.setup();
    render(<ReanalyseAction {...props} analyzed onAnalyze={onAnalyze} />);

    await user.click(screen.getByRole("button", { name: /réanalyser cette partie/i }));

    expect(onAnalyze).not.toHaveBeenCalled();
  });

  it("makes Cancel the primary action, and cancelling touches nothing", async () => {
    const onAnalyze = vi.fn();
    const user = userEvent.setup();
    render(<ReanalyseAction {...props} analyzed onAnalyze={onAnalyze} />);

    await user.click(screen.getByRole("button", { name: /réanalyser cette partie/i }));
    const cancel = screen.getByRole("button", { name: /annuler/i });
    expect(cancel.dataset.action).toBe("primary");

    await user.click(cancel);

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onAnalyze).not.toHaveBeenCalled();
  });

  it("runs the pass once, and only once, on confirmation", async () => {
    const onAnalyze = vi.fn();
    const user = userEvent.setup();
    render(<ReanalyseAction {...props} analyzed onAnalyze={onAnalyze} />);

    await user.click(screen.getByRole("button", { name: /réanalyser cette partie/i }));
    await user.click(screen.getByRole("button", { name: /^réanalyser$/i }));

    expect(onAnalyze).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("asks nothing on a Game that was never analysed: there is nothing to overwrite", async () => {
    const onAnalyze = vi.fn();
    const user = userEvent.setup();
    render(<ReanalyseAction {...props} analyzed={false} onAnalyze={onAnalyze} />);

    await user.click(screen.getByRole("button", { name: /analyser cette partie/i }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onAnalyze).toHaveBeenCalledTimes(1);
  });

  it("is reachable and usable by keyboard, and the warning carries an accessible name", async () => {
    const onAnalyze = vi.fn();
    const user = userEvent.setup();
    render(<ReanalyseAction {...props} analyzed onAnalyze={onAnalyze} />);

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /réanalyser cette partie/i }));
    await user.keyboard("{Enter}");

    expect(screen.getByRole("alertdialog", { name: /confirmer la réanalyse/i })).toBeTruthy();
    // ...and the two choices are reachable from there, Cancel included.
    await user.tab();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /annuler/i }));
    await user.keyboard("{Enter}");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onAnalyze).not.toHaveBeenCalled();
  });
});
