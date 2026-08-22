-- Hand-written (ADR-0015). `Time control category` becomes OUR five-value
-- vocabulary instead of chess.com's four: `daily` is renamed
-- **`correspondence`** — the game's own word, the one that survives now that
-- chess.com is not the only Platform — and **`classical`** is added, because it
-- has no honest home (folded into `rapid` it averages a 10-minute game with a
-- 60-minute one; folded into correspondence it mixes real-time with move-a-day).
--
-- Nothing here rebuilds a table, so **no `Evaluation` is touched**: the Games
-- keep their ids, and the rows only engine time can produce are never in the
-- path of this migration. That is the property the accompanying test asserts.
--
-- No `meta/` snapshot accompanies this migration: `drizzle-kit generate` has to
-- ASK whether `daily -> correspondence` is a rename or a drop-plus-add, and that
-- prompt cannot be answered non-interactively. The chain is already unreliable
-- here — `0010_snapshot.json` predates its own hand-written SQL and still shows
-- `move_habits`/`analysis_passes` without `profile_id` — so the migrator's
-- journal, not the snapshots, is what this project actually applies.
--
-- Games: a value rewrite, idempotent by its own WHERE clause.
UPDATE `games` SET `time_control_category` = 'correspondence' WHERE `time_control_category` = 'daily';--> statement-breakpoint
--
-- Move habits: the counter is RENAMED, not re-derived — a rename preserves
-- every value where a recount would have to replay PGNs we no longer need to
-- read. `classical` starts at 0 and that default is *honest without a backfill*:
-- every existing row was counted from chess.com games, and chess.com never
-- produced a `classical` game, so zero is the true count rather than a
-- placeholder.
ALTER TABLE `move_habits` RENAME COLUMN `daily` TO `correspondence`;--> statement-breakpoint
ALTER TABLE `move_habits` ADD `classical` integer DEFAULT 0 NOT NULL;
