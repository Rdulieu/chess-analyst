import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ConfrontationsPage } from "../src/pages/ConfrontationsPage";
import { CurrentProfileProvider } from "../src/features/profiles/CurrentProfileContext";
import type { ConfrontationSummary } from "../src/types";

const EMPTY_ROW = { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 };

function summary(over: Partial<ConfrontationSummary> = {}): ConfrontationSummary {
  return {
    readings: 7,
    provenance: { unaided: 5, informed: 2 },
    severity: {
      countedMoves: 200,
      examined: 60,
      scorable: 55,
      agreed: 33,
      matrix: {
        blunder: { ...EMPTY_ROW, mistake: 8 },
        mistake: { ...EMPTY_ROW, mistake: 10 },
        inaccuracy: { ...EMPTY_ROW, inaccuracy: 5 },
        sound: { ...EMPTY_ROW, none: 18, mistake: 14 },
        good: { ...EMPTY_ROW, none: 5 },
      },
      unscored: { good: 5, opponent: 3 },
    },
    keyMoments: { marked: 9, damageFound: 210, damageTotal: 400, drift: 120 },
    ...over,
  };
}

function stub(body: ConfrontationSummary) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.startsWith("/api/profiles"))
        return { ok: true, status: 200, json: async () => [{ id: 3, handle: "Me", platform: "chess.com" }] } as Response;
      if (url.startsWith("/api/personal/confrontation"))
        return { ok: true, status: 200, json: async () => body } as Response;
      throw new Error(`unexpected request: ${url}`);
    }),
  );
}

function renderPage() {
  localStorage.setItem("chess-analyst.current-profile", "3");
  return render(
    <CurrentProfileProvider>
      <MemoryRouter>
        <ConfrontationsPage />
      </MemoryRouter>
    </CurrentProfileProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("The Confrontation summary", () => {
  it("shows the three figures, separated, each with its counts", async () => {
    stub(summary());
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole("group", { name: /ce que j'ai examiné/i })).not.toBeNull(),
    );
    expect(screen.getByRole("group", { name: /ce que j'ai vu juste/i })).not.toBeNull();
    expect(screen.getByRole("group", { name: /où j'ai regardé/i })).not.toBeNull();
  });

  it("shows no composite score, at this level either", async () => {
    stub(summary());
    const { container } = renderPage();

    await waitFor(() => expect(screen.getAllByRole("group").length).toBeGreaterThan(0));
    // Three named questions, three rates. A fourth number would be a composite,
    // and a composite is optimised by imitating the engine.
    const rates = (container.textContent ?? "").match(/\d+ %/g) ?? [];
    expect(rates.filter((r) => r !== "100 %")).toHaveLength(3);
  });

  it("says how many readings it rests on", async () => {
    stub(summary());
    renderPage();

    // Three readings are not a tendency, and it is the Player who judges that.
    await waitFor(() => expect(screen.getByText(/7 lectures/i)).not.toBeNull());
  });

  it("counts the provenance without cutting the figures by it", async () => {
    stub(summary());
    renderPage();

    await waitFor(() => expect(screen.getByText(/à l'aveugle/i)).not.toBeNull());
    const provenance = document.querySelector('[data-part="summary-provenance"]');
    expect(provenance?.textContent).toMatch(/5/);
    expect(provenance?.textContent).toMatch(/2/);
    // One set of figures, not two.
    expect(screen.getAllByRole("group", { name: /ce que j'ai vu juste/i })).toHaveLength(1);
  });

  it("offers no axis at all", async () => {
    stub(summary());
    const { container } = renderPage();

    await waitFor(() => expect(screen.getAllByRole("group").length).toBeGreaterThan(0));
    // A Personal analysis is written by hand: the sample is tens of Games where
    // the play aggregates have thousands, and slicing a handful says nothing.
    expect(container.textContent).not.toMatch(/ouverture|cadence|phase/i);
    expect(container.querySelector("select")).toBeNull();
  });

  it("tells a Profile with no sealed reading, rather than showing a summary of zeros", async () => {
    stub(
      summary({
        readings: 0,
        provenance: { unaided: 0, informed: 0 },
        severity: {
          countedMoves: 0,
          examined: 0,
          scorable: 0,
          agreed: 0,
          matrix: { blunder: EMPTY_ROW, mistake: EMPTY_ROW, inaccuracy: EMPTY_ROW, sound: EMPTY_ROW, good: EMPTY_ROW },
          unscored: { good: 0, opponent: 0 },
        },
        keyMoments: { marked: 0, damageFound: 0, damageTotal: 0, drift: 0 },
      }),
    );
    renderPage();

    await waitFor(() => expect(screen.getByText(/aucune lecture scellée/i)).not.toBeNull());
    // A summary of zeros would say the Player reads badly. They have not read yet.
    expect(screen.queryByRole("group", { name: /ce que j'ai vu juste/i })).toBeNull();
  });

  it("says the limit of the method in the product, not only in the docs", async () => {
    stub(summary());
    const { container } = renderPage();

    await waitFor(() => expect(screen.getAllByRole("group").length).toBeGreaterThan(0));
    // Judging our own analysis by Player/engine agreement assumes the Player
    // right, which is exactly what is not established.
    expect(container.textContent).toMatch(/divergence/i);
    expect(container.textContent).toMatch(/où regarder, (et )?pas qui se trompe/i);
  });
});
