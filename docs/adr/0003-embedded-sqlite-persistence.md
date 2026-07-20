# Analyses and statistics are persisted in an embedded SQLite database

The player wants some analyses and statistics saved across sessions. Consistent with ADR-0002
(everything runs only on the player's own machine, launched on demand, nothing else to start),
we store this data in an **embedded SQLite database** — a single file on disk, accessed
directly by the local Node server, no separate database service to run. The server accesses it
through **Drizzle ORM** (TypeScript-first schema and queries, no codegen step, thin runtime).

## Considered options

- **Postgres/MySQL via Docker**: rejected, same reasoning as ADR-0002 — adds a service to start alongside the app instead of "launch and it works."
- **Raw SQL over `better-sqlite3` directly**: viable, but loses type-safe schema/queries for little benefit here.
- **Prisma**: heavier runtime and a codegen step; Drizzle gives similar type safety with less machinery for a small solo project.

## Consequences

Data (games, positions, computed stats) lives in one file, easy to back up or move. If multi-device sync or sharing ever becomes a real need, this is the point that would need revisiting (ADR-0002's "own machine only" premise would need to change first).
