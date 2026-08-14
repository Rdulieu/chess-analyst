-- Hand-adjusted: SQLite cannot add a NOT NULL column to a populated table
-- without a default. The empty string is the sentinel for "predates the column"
-- — `repairMissingFens` replays those rows' PGN at open (ADR-0012). The default
-- is deliberately *not* declared in schema.ts, so the TypeScript insert type
-- keeps requiring a FEN and no write path can quietly omit one.
ALTER TABLE `evaluations` ADD `fen` text DEFAULT '' NOT NULL;
