import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AnalysisPassStatus } from "../src/features/analysis/AnalysisPassStatus";
import type { AnalysisStatus } from "../src/types";

const pass = (over: Partial<AnalysisStatus> = {}): AnalysisStatus => ({
  running: false,
  total: 12,
  done: 12,
  games: 2,
  acknowledged: false,
  outcome: "completed",
  error: null,
  ...over,
});

describe("AnalysisPassStatus — how the pass ended", () => {
  it("confirms a completed pass with both figures", () => {
    render(<AnalysisPassStatus status={pass()} />);

    // Labelled as the *last pass*, so it cannot be taken for the history count
    // sitting a few pixels above.
    expect(screen.getByText(/dernière analyse/i).textContent).toMatch(
      /2 parties, 12 positions évaluées/i,
    );
  });

  it("says a pass was interrupted, showing what it did get through", () => {
    render(<AnalysisPassStatus status={pass({ outcome: "interrupted", done: 5 })} />);

    expect(screen.getByText(/interrompu/i)).toBeTruthy();
    expect(screen.getByText(/5\/12/)).toBeTruthy();
  });

  it("says a pass failed, and what went wrong", () => {
    render(
      <AnalysisPassStatus
        status={pass({ outcome: "failed", done: 5, error: "engine backend unavailable" })}
      />,
    );

    expect(screen.getByText(/échec/i)).toBeTruthy();
    expect(screen.getByText(/engine backend unavailable/)).toBeTruthy();
  });

  it("keeps the dismiss control out of the live region, so it is not announced with every update", () => {
    render(<AnalysisPassStatus status={pass()} onAcknowledge={() => {}} />);

    const live = screen.getByRole("status", { name: /progression de l'analyse/i });
    expect(live.textContent).not.toMatch(/fermer/i);
    expect(screen.getByRole("button", { name: /fermer/i })).toBeTruthy();
  });
});

describe("AnalysisPassStatus — the two refusals are not the same fact", () => {
  it("says a pass is already running, rather than claiming the selection is analysed", () => {
    render(<AnalysisPassStatus status={null} blocked />);

    // A Player who just confirmed overwriting an analysis and reads "déjà
    // analysée" is being contradicted about the act they authorised.
    expect(screen.getByRole("status").textContent).toMatch(/déjà en cours/i);
    expect(screen.getByRole("status").textContent).not.toMatch(/déjà analysée/i);
  });

  it("keeps the 'nothing to analyse' wording for what it actually describes", () => {
    render(<AnalysisPassStatus status={null} nothingToDo />);

    expect(screen.getByRole("status").textContent).toMatch(/déjà analysée/i);
  });
});
