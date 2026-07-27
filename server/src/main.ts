import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { openDb } from "./db";
import { createApp } from "./app";
import { createHttpChessComClient } from "./chesscom";
import { createEngine } from "./engine";

const PORT = Number(process.env.PORT ?? 3001);

// One SQLite file on disk, next to the server package (ADR-0003).
const here = dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.DB_FILE ?? resolve(here, "..", "chess-analyst.db");

const { db } = openDb(DB_FILE);

// Real chess.com client; base URL overridable via CHESSCOM_BASE_URL (e.g. to
// point the agentic Feature Path at a fixture archive). The engine backend is
// selected the same way (ENGINE_BACKEND / STOCKFISH_PATH) — ADR-0008.
const app = createApp(db, createHttpChessComClient(), createEngine());
app.listen(PORT, () => {
  console.log(`chess-analyst server listening on http://localhost:${PORT}`);
});
