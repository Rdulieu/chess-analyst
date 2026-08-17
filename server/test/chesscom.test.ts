import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { AddressInfo } from "node:net";
import { createHttpChessComClient } from "../src/chesscom";

/**
 * A tiny stand-in for chess.com's public API, so the real fetch-based client is
 * exercised end to end (URL building, JSON parsing, 404 handling) without any
 * external network. "known" has one archive for 2024/01; "ghost" does not exist.
 */
const ARCHIVE = {
  games: [
    {
      url: "https://www.chess.com/game/live/42",
      pgn: "1. e4 e5",
      time_class: "blitz",
      rules: "chess",
      end_time: 1704067200,
      white: { username: "known", result: "win" },
      black: { username: "opp", result: "resigned" },
    },
  ],
};

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.get("/pub/player/:username", (req, res) => {
    // chess.com answers the username LOWERCASED and carries the member's own
    // casing in `url` — which is why the canonical spelling is read off there.
    if (req.params.username.toLowerCase() === "known") {
      res.json({ username: "known", url: "https://www.chess.com/member/KnoWn" });
    }
    else res.status(404).json({ code: 0, message: "not found" });
  });
  app.get("/pub/player/:username/games/:year/:month", (req, res) => {
    if (req.params.username === "known" && req.params.year === "2024" && req.params.month === "01") {
      res.json(ARCHIVE);
    } else {
      res.status(404).json({ code: 0, message: "not found" });
    }
  });
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

describe("http chess.com client", () => {
  it("fetches and returns a month's games", async () => {
    const client = createHttpChessComClient(baseUrl);

    const games = await client.fetchMonth("known", 2024, 1);

    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({
      url: "https://www.chess.com/game/live/42",
      time_class: "blitz",
    });
  });

  it("returns an empty month rather than throwing when the archive is absent", async () => {
    const client = createHttpChessComClient(baseUrl);

    await expect(client.fetchMonth("known", 2025, 12)).resolves.toEqual([]);
  });

  it("answers a player with the casing chess.com itself spells them in", async () => {
    // The whole point of asking chess.com rather than trusting what was typed:
    // `known` and `KNOWN` must come back as the one spelling `KnoWn`, so a
    // Profile cannot be created twice for one account (US-11, ADR-0014).
    const client = createHttpChessComClient(baseUrl);

    await expect(client.fetchPlayer("known")).resolves.toEqual({ username: "KnoWn" });
    await expect(client.fetchPlayer("KNOWN")).resolves.toEqual({ username: "KnoWn" });
  });

  it("tells an unknown account apart from a chess.com it could not reach", async () => {
    // Two different answers on purpose: the first is the user's typo, the second
    // is nobody's fault — and only the first should ever read as one.
    const client = createHttpChessComClient(baseUrl);
    await expect(client.fetchPlayer("ghost")).resolves.toBeNull();

    const unreachable = createHttpChessComClient("http://127.0.0.1:1/pub-does-not-listen");
    await expect(unreachable.fetchPlayer("known")).rejects.toThrow();
  });
});
