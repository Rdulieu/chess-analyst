import { afterEach, describe, it, expect, vi } from "vitest";
import { runAnalysis } from "../src/features/analysis/runAnalysis";
import type { AnalysisStatus } from "../src/types";

const json = (body: unknown, status = 200) => ({ ok: status < 300, status, json: async () => body }) as Response;

afterEach(() => vi.unstubAllGlobals());

describe("runAnalysis", () => {
  it("starts the pass for exactly the given Games, under the Profile it is for, and reports progress until it stops running", async () => {
    let statusPolls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        // Both legs name the Profile (ADR-0014): a pass is started for one
        // Player, and polled on that Player's own readout.
        if (url === "/api/analyze?profileId=4" && opts?.method === "POST") {
          expect(JSON.parse(opts.body as string)).toEqual({ gameIds: [7], overwrite: false });
          return json({ running: true, total: 3, done: 0, games: 1 }, 202);
        }
        if (url === "/api/analyze/status?profileId=4") {
          statusPolls += 1;
          return json({ running: false, total: 3, done: 3, games: 1 });
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    const seen: AnalysisStatus[] = [];
    await runAnalysis(4, [7], (s) => seen.push(s));

    expect(statusPolls).toBe(1);
    expect(seen).toEqual([
      { running: true, total: 3, done: 0, games: 1 },
      { running: false, total: 3, done: 3, games: 1 },
    ]);
  });
});

describe("runAnalysis — overwriting an existing analysis", () => {
  it("carries the Player's confirmation to the server, which otherwise refuses the pass", async () => {
    const posts: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url.startsWith("/api/analyze?") && opts?.method === "POST") {
          posts.push(JSON.parse(opts.body as string));
          return { ok: true, status: 202, json: async () => ({ running: false, total: 3, done: 3, started: true }) } as Response;
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    await runAnalysis(1, [7], () => {}, true);

    // Without this flag the server filters an already-analysed Game out and
    // opens no pass at all — the confirmation would warn about nothing.
    expect(posts).toEqual([{ gameIds: [7], overwrite: true }]);
  });
});
