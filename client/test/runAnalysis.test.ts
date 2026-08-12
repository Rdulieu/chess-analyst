import { afterEach, describe, it, expect, vi } from "vitest";
import { runAnalysis } from "../src/features/analysis/runAnalysis";
import type { AnalysisStatus } from "../src/types";

const json = (body: unknown, status = 200) => ({ ok: status < 300, status, json: async () => body }) as Response;

afterEach(() => vi.unstubAllGlobals());

describe("runAnalysis", () => {
  it("starts the pass for exactly the given Games and reports progress until it stops running", async () => {
    let statusPolls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url === "/api/analyze" && opts?.method === "POST") {
          expect(JSON.parse(opts.body as string)).toEqual({ gameIds: [7] });
          return json({ running: true, total: 1, done: 0 }, 202);
        }
        if (url === "/api/analyze/status") {
          statusPolls += 1;
          return json({ running: false, total: 1, done: 1 });
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    const seen: AnalysisStatus[] = [];
    await runAnalysis([7], (s) => seen.push(s));

    expect(statusPolls).toBe(1);
    expect(seen).toEqual([
      { running: true, total: 1, done: 0 },
      { running: false, total: 1, done: 1 },
    ]);
  });
});
