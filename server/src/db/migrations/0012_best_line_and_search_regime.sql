-- Hand-written (ADR-0015). drizzle-kit's generated version re-adds columns that
-- migration 0010 (also hand-written) already added, and rebuilds `move_habits`
-- for nothing; only its snapshot is kept, so the next `db:generate` starts from
-- the real schema.
--
-- This is the one upgrade in this project that **destroys data no re-import can
-- rebuild** — the named exception to ADR-0015. An `Evaluation` stored before
-- this migration carries no `Best line`, and a line cannot be invented after the
-- fact: the search that knew it is over. Rather than keep those rows and make
-- every read path branch forever on "line or no line", they go, and `pv` becomes
-- required (ADR-0016).
--
-- Scope is strict: the **Evaluations**, not the database. Profiles, Games, their
-- PGNs, Openings and `move_habits` are untouched — nothing here reads or writes
-- them, save for the one flag below.
DELETE FROM `evaluations`;--> statement-breakpoint
--
-- A Game whose Evaluations are gone is **not** an analyzed Game. Leaving the flag
-- set would make it report as analyzed with nothing to show, and — worse — would
-- keep the Player from re-running the pass on it. Clearing it is the honest
-- consequence of the deletion above, not a second act of destruction: the flag is
-- derived from Evaluations that no longer exist.
UPDATE `games` SET `analyzed` = false;--> statement-breakpoint
--
-- The rebuild that makes `pv` required. It runs on an **empty** table (above), so
-- the copy cannot lose a row; the `NOT NULL` is the assertion for every insert
-- from now on. `openDb` runs migrations with foreign keys off — SQLite's
-- documented table-rebuild procedure — and re-checks every reference afterwards.
CREATE TABLE `__new_evaluations` (
	`game_id` integer NOT NULL REFERENCES games(id),
	`ply` integer NOT NULL,
	`fen` text NOT NULL,
	`cp` integer,
	`mate` integer,
	`pv` text NOT NULL,
	`cp2` integer,
	`mate2` integer,
	`pass_id` integer REFERENCES analysis_passes(id),
	PRIMARY KEY(`game_id`, `ply`)
);--> statement-breakpoint
DROP TABLE `evaluations`;--> statement-breakpoint
ALTER TABLE `__new_evaluations` RENAME TO `evaluations`;--> statement-breakpoint
--
-- The `Search regime` on the pass (CONTEXT.md): depth and number of lines, once
-- per run rather than repeated on every Evaluation. Defaulted to 0 so the column
-- can exist on the passes already recorded — a regime nobody claims, which is
-- exactly what those passes can honestly say about themselves.
ALTER TABLE `analysis_passes` ADD `depth` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `analysis_passes` ADD `lines` integer DEFAULT 0 NOT NULL;
