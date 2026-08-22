import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ImportSummary } from "../src/features/import/ImportSummary";
import type { ImportResult } from "../src/types";

const result: ImportResult = {
  totalFetched: 6,
  imported: 4,
  alreadyPresent: 1,
  byCategory: { bullet: 1, blitz: 2, rapid: 1, classical: 0, correspondence: 0 },
  results: { win: 2, draw: 1, loss: 1 },
  months: [
    { month: { year: 2024, month: 1 }, imported: 4, alreadyPresent: 1 },
    { month: { year: 2024, month: 2 }, imported: 0, alreadyPresent: 0 },
    {
      month: { year: 2024, month: 3 },
      imported: 0,
      alreadyPresent: 0,
      failure: "chess.com request failed (429)",
    },
  ],
};

describe("ImportSummary", () => {
  it("shows totals, per-category breakdown, new vs already present, and the W/D/L tally", () => {
    render(<ImportSummary result={result} />);

    const box = screen.getByLabelText(/import summary/i);
    const text = box.textContent ?? "";

    expect(text).toMatch(/6/); // total fetched
    expect(text).toMatch(/4 imported/i);
    expect(text).toMatch(/1 already present/i);
    // per-category (categories with games are shown)
    expect(text).toMatch(/blitz.*2|2.*blitz/i);
    expect(text).toMatch(/rapid.*1|1.*rapid/i);
    expect(text).toMatch(/bullet.*1|1.*bullet/i);
    // W/D/L
    expect(text).toMatch(/2\s*W|W\s*2|2 win/i);
    expect(text).toMatch(/1\s*D|D\s*1|1 draw/i);
    expect(text).toMatch(/1\s*L|L\s*1|1 loss/i);
  });

  it("announces the win/draw/loss tally in full words for assistive tech", () => {
    render(<ImportSummary result={result} />);

    // Compact "W · D · L" stays visible, but each figure carries a spelled-out
    // accessible name (correctly singular/plural).
    expect(screen.getByLabelText(/^2 wins$/i)).toBeTruthy();
    expect(screen.getByLabelText(/^1 draw$/i)).toBeTruthy();
    expect(screen.getByLabelText(/^1 loss$/i)).toBeTruthy();
  });

  it("lists one line per month of the range, in order, after the consolidated totals", () => {
    render(<ImportSummary result={result} />);

    const lines = screen.getAllByRole("listitem", { name: /2024-\d\d/ });
    expect(lines.map((li) => li.textContent)).toEqual([
      expect.stringContaining("2024-01"),
      expect.stringContaining("2024-02"),
      expect.stringContaining("2024-03"),
    ]);
    expect(lines[0].textContent).toMatch(/4/); // what January brought in
  });

  it("marks a month chess.com could not answer for, distinguishably from an inactive month", () => {
    render(<ImportSummary result={result} />);

    const [, inactive, failed] = screen.getAllByRole("listitem", { name: /2024-\d\d/ });

    // The failure is carried by words, and only reinforced by a tint the sheet
    // applies on the line's own `data-failed` hook.
    expect(failed.textContent).toMatch(/échec|erreur|failed/i);
    expect(failed.textContent).toMatch(/429/);
    expect(inactive.textContent).not.toMatch(/échec|erreur|failed/i);

    expect(failed.getAttribute("data-failed")).toBe("true");
    expect(failed.getAttribute("style")).toBeNull();
    expect(inactive.getAttribute("data-failed")).toBeNull();
  });
});
