import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi } from "vitest";
import { ImportForm } from "../src/features/import/ImportForm";

const json = (body: unknown, status = 200) =>
  ({ ok: status < 300, status, json: async () => body }) as Response;

const emptyResult = {
  totalFetched: 2,
  imported: 2,
  alreadyPresent: 0,
  byCategory: { bullet: 0, blitz: 2, rapid: 0, daily: 0 },
  results: { win: 2, draw: 0, loss: 0 },
  months: [
    { month: { year: 2024, month: 1 }, imported: 2, alreadyPresent: 0 },
    { month: { year: 2024, month: 2 }, imported: 0, alreadyPresent: 0 },
    { month: { year: 2024, month: 3 }, imported: 0, alreadyPresent: 0 },
  ],
};

/** The current month as an <input type="month"> value, as the form defaults to it. */
const thisMonth = () => new Date().toISOString().slice(0, 7);

afterEach(() => vi.unstubAllGlobals());

/** Stubs the relay: settings, then the Import start + the given status polls. */
function stubRelay(polls: unknown[], total = polls.length) {
  const posted: unknown[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, opts?: RequestInit) => {
      if (url === "/api/settings") return json({ username: null });
      if (url === "/api/import" && opts?.method === "POST") {
        posted.push(JSON.parse(opts.body as string));
        return json({ running: true, total, done: 0, result: null }, 202);
      }
      if (url === "/api/import/status") return json(polls.shift());
      throw new Error(`unexpected fetch: ${url}`);
    }),
  );
  return posted;
}

describe("ImportForm", () => {
  it("offers a first and a last month, both defaulting to the current month", async () => {
    stubRelay([]);
    render(<ImportForm onImported={() => {}} />);

    const from = await screen.findByLabelText(/^du$/i);
    const to = screen.getByLabelText(/^au$/i);
    expect((from as HTMLInputElement).value).toBe(thisMonth());
    expect((to as HTMLInputElement).value).toBe(thisMonth());
  });

  it("submits the range the Player chose and reports progress in months", async () => {
    const posted = stubRelay([{ running: false, total: 3, done: 3, result: emptyResult }], 3);
    render(<ImportForm onImported={() => {}} />);

    await userEvent.type(await screen.findByLabelText(/username/i), "me");
    await userEvent.clear(screen.getByLabelText(/^du$/i));
    await userEvent.type(screen.getByLabelText(/^du$/i), "2024-01");
    await userEvent.clear(screen.getByLabelText(/^au$/i));
    await userEvent.type(screen.getByLabelText(/^au$/i), "2024-03");
    await userEvent.click(screen.getByRole("button", { name: /import/i }));

    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toMatchObject({
      username: "me",
      from: { year: 2024, month: 1 },
      to: { year: 2024, month: 3 },
    });

    // Determinate progress, counted in months — not an indeterminate spinner.
    const progress = await screen.findByLabelText(/import progress/i);
    expect(progress.textContent).toMatch(/0\s*\/\s*3/);

    await screen.findByLabelText(/import summary/i);
  });
});
