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
  byCategory: { bullet: 0, blitz: 2, rapid: 0, classical: 0, correspondence: 0 },
  results: { win: 2, draw: 0, loss: 0 },
  months: [
    { month: { year: 2024, month: 1 }, imported: 2, alreadyPresent: 0 },
    { month: { year: 2024, month: 2 }, imported: 0, alreadyPresent: 0 },
    { month: { year: 2024, month: 3 }, imported: 0, alreadyPresent: 0 },
  ],
};

/** The `Profile` these tests import under — a chess.com account, as before. */
const PROFILE = {
  id: 7,
  platform: "chesscom" as const,
  username: "DudulSmash",
  createdAt: "2026-01-01T00:00:00.000Z",
  games: 0,
  analyzed: 0,
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
  it("labels each field beside its own control, and marks one action as the primary one", async () => {
    stubRelay([]);
    render(<ImportForm profile={PROFILE} onImported={() => {}} />);

    // Each text field is a labelled control of its own, not a control buried in
    // the label's text — which is what lets the label sit above the field.
    for (const name of [/^du$/i, /^au$/i]) {
      const field = await screen.findByLabelText(name);
      const label = document.querySelector(`label[for="${field.id}"]`);
      expect(field.id).toBeTruthy();
      expect(label).toBeTruthy();
      expect(label!.contains(field)).toBe(false);
      expect(label!.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }

    // The action that starts the Import is the form's primary one, and says so
    // structurally rather than by looking different.
    const submit = screen.getByRole("button", { name: /import/i });
    expect(submit.getAttribute("type")).toBe("submit");
    expect(submit.dataset.action).toBe("primary");
  });

  it("asks for no username — the account is the Profile's own", async () => {
    // The field's disappearance IS the guarantee: it was the only way one
    // account's Games could ever be imported under another's Profile (US-11).
    stubRelay([]);
    render(<ImportForm profile={PROFILE} onImported={() => {}} />);

    await screen.findByLabelText(/^du$/i);
    expect(screen.queryByLabelText(/username|compte/i)).toBeNull();
  });

  it("offers a first and a last month, both defaulting to the current month", async () => {
    stubRelay([]);
    render(<ImportForm profile={PROFILE} onImported={() => {}} />);

    const from = await screen.findByLabelText(/^du$/i);
    const to = screen.getByLabelText(/^au$/i);
    expect((from as HTMLInputElement).value).toBe(thisMonth());
    expect((to as HTMLInputElement).value).toBe(thisMonth());
  });

  it("submits the range the Player chose and reports progress in months", async () => {
    const posted = stubRelay([{ running: false, total: 3, done: 3, result: emptyResult }], 3);
    render(<ImportForm profile={PROFILE} onImported={() => {}} />);

    await userEvent.clear(screen.getByLabelText(/^du$/i));
    await userEvent.type(screen.getByLabelText(/^du$/i), "2024-01");
    await userEvent.clear(screen.getByLabelText(/^au$/i));
    await userEvent.type(screen.getByLabelText(/^au$/i), "2024-03");
    await userEvent.click(screen.getByRole("button", { name: /import/i }));

    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toMatchObject({
      profileId: 7,
      from: { year: 2024, month: 1 },
      to: { year: 2024, month: 3 },
    });

    // Determinate progress, counted in months — not an indeterminate spinner.
    const progress = await screen.findByLabelText(/import progress/i);
    expect(progress.textContent).toMatch(/0\s*\/\s*3/);

    await screen.findByLabelText(/import summary/i);
  });

  /** Types a range into the form, both bounds. */
  async function chooseRange(from: string, to: string) {
    for (const [label, value] of [[/^du$/i, from], [/^au$/i, to]] as const) {
      await userEvent.clear(await screen.findByLabelText(label));
      await userEvent.type(screen.getByLabelText(label), value);
    }
  }

  it("asks for confirmation before starting a range longer than 24 months", async () => {
    const posted = stubRelay([{ running: false, total: 36, done: 36, result: emptyResult }], 36);
    const confirm = vi.fn((message: string) => Boolean(message));
    vi.stubGlobal("confirm", confirm);
    render(<ImportForm profile={PROFILE} onImported={() => {}} />);

    await chooseRange("2021-01", "2023-12"); // 36 months
    await userEvent.click(screen.getByRole("button", { name: /import/i }));

    expect(confirm).toHaveBeenCalledOnce();
    expect(confirm.mock.calls[0][0]).toMatch(/36/);
    await waitFor(() => expect(posted).toHaveLength(1)); // confirmed → it runs
  });

  it("starts nothing and keeps the entry intact when the Player declines", async () => {
    const posted = stubRelay([]);
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(<ImportForm profile={PROFILE} onImported={() => {}} />);

    await chooseRange("2021-01", "2023-12");
    await userEvent.click(screen.getByRole("button", { name: /import/i }));

    expect(posted).toHaveLength(0);
    expect((screen.getByLabelText(/^du$/i) as HTMLInputElement).value).toBe("2021-01");
    expect((screen.getByLabelText(/^au$/i) as HTMLInputElement).value).toBe("2023-12");
  });

  it("does not ask for confirmation on a range of 24 months or fewer", async () => {
    const posted = stubRelay([{ running: false, total: 24, done: 24, result: emptyResult }], 24);
    const confirm = vi.fn((message: string) => Boolean(message));
    vi.stubGlobal("confirm", confirm);
    render(<ImportForm profile={PROFILE} onImported={() => {}} />);

    await chooseRange("2022-01", "2023-12"); // exactly 24 months
    await userEvent.click(screen.getByRole("button", { name: /import/i }));

    expect(confirm).not.toHaveBeenCalled();
    await waitFor(() => expect(posted).toHaveLength(1));
  });

  it("names the Platform it will fetch from, read off the Profile", async () => {
    // Nobody should be one click away from importing from the wrong site: the
    // form says which, and says it from the Profile rather than from fixed text.
    stubRelay([]);
    render(<ImportForm profile={{ ...PROFILE, platform: "lichess", username: "Metalyst" }} onImported={() => {}} />);

    const text = screen.getByRole("form", { name: "import" }).textContent ?? "";
    expect(text).toMatch(/lichess\.org/);
    expect(text).toMatch(/Metalyst/);
    expect(text).not.toMatch(/chess\.com/);
  });
});
