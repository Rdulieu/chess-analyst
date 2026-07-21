import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ImportSummary } from "../src/features/import/ImportSummary";
import type { ImportResult } from "../src/types";

const result: ImportResult = {
  totalFetched: 6,
  imported: 4,
  alreadyPresent: 1,
  byCategory: { bullet: 1, blitz: 2, rapid: 1, daily: 0 },
  results: { win: 2, draw: 1, loss: 1 },
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
});
