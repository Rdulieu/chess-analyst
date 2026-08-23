import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { openDb } from "./db";
import { createApp } from "./app";
import { createHttpChessComClient, createHttpLichessClient } from "./platform";
import { createEngine } from "./engine";

const PORT = Number(process.env.PORT ?? 3001);

// One SQLite file on disk, next to the server package (ADR-0003).
const here = dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.DB_FILE ?? resolve(here, "..", "chess-analyst.db");

const { db } = openDb(DB_FILE);

// One adapter per supported Platform (ADR-0016); base URLs overridable by
// environment (CHESSCOM_BASE_URL, LICHESS_BASE_URL) so the agentic Feature Path
// can point at a fixture archive. The engine backend is selected the same way
// (ENGINE_BACKEND / STOCKFISH_PATH) — ADR-0008.
const app = createApp(
  db,
  { chesscom: createHttpChessComClient(), lichess: createHttpLichessClient() },
  createEngine(),
);
app.listen(PORT, () => {
  console.log(`chess-analyst server listening on http://localhost:${PORT}`);
});
