import { afterEach, describe, it, expect, vi } from "vitest";
import { runImport } from "../src/features/import/runImport";
import type { ImportParams, ImportStatus } from "../src/types";

const json = (body: unknown, status = 200) =>
  ({ ok: status < 300, status, json: async () => body }) as Response;

const params: ImportParams = {
  username: "me",
  from: { year: 2024, month: 1 },
  to: { year: 2024, month: 3 },
  categories: ["blitz"],
};

afterEach(() => vi.unstubAllGlobals());

describe("runImport", () => {
  it("starts the Import for the given range and reports progress until it stops running", async () => {
    const polls = [
      { running: true, total: 3, done: 1, result: null },
      { running: false, total: 3, done: 3, result: { imported: 4 } },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url === "/api/import" && opts?.method === "POST") {
          expect(JSON.parse(opts.body as string)).toEqual(params);
          return json({ running: true, total: 3, done: 0, result: null }, 202);
        }
        if (url === "/api/import/status") return json(polls.shift());
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    const seen: ImportStatus[] = [];
    const final = await runImport(params, (s) => seen.push(s));

    expect(seen.map((s) => s.done)).toEqual([0, 1, 3]);
    expect(final).toMatchObject({ running: false, done: 3, result: { imported: 4 } });
  });

  it("surfaces the server's reason when the Import cannot be started", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: "Unknown chess.com username: ghost" }, 404)));

    await expect(runImport(params, () => {})).rejects.toThrow(/ghost/);
  });
});
