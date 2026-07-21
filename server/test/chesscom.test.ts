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
    if (req.params.username === "known") res.json({ username: "known" });
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

  it("reports whether a player exists via the profile endpoint", async () => {
    const client = createHttpChessComClient(baseUrl);

    await expect(client.playerExists("known")).resolves.toBe(true);
    await expect(client.playerExists("ghost")).resolves.toBe(false);
  });
});
