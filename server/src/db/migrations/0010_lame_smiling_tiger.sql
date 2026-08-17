-- Hand-written (ADR-0015). drizzle-kit's generated version adds `profile_id` as
-- `NOT NULL` in one step, which SQLite refuses on a table that already holds
-- rows — and which would, if it worked, be the wrong shape anyway. The order
-- below **is** the safety property: nullable column -> create the Profile the
-- existing rows belong to -> assign them -> rebuild the table with `NOT NULL`.
-- The rebuild's copy is the assertion: a row left unassigned makes the whole
-- migration fail rather than complete quietly with half the history orphaned.
--
-- The Profile is derived from the Games themselves — the PGN's [White]/[Black]
-- header for the side the Player played — so the upgrade needs no network call
-- and no name typed in. A Game whose header cannot be read yields a NULL
-- username, and the `profiles` NOT NULL stops the migration there.
--
-- Rebuilding `games` means dropping it, which momentarily orphans every
-- `Evaluation` pointing at it. `openDb` therefore runs the migrations with
-- foreign keys off (SQLite's documented table-rebuild procedure) and re-checks
-- every reference afterwards, so nothing broken survives the step.
ALTER TABLE `games` ADD `profile_id` integer REFERENCES profiles(id);--> statement-breakpoint
CREATE TEMP VIEW `game_owner` AS
SELECT
	`id`,
	CASE
		WHEN `player_color` = 'white' AND instr(`pgn`, '[White "') > 0
			THEN substr(substr(`pgn`, instr(`pgn`, '[White "') + 8), 1, instr(substr(`pgn`, instr(`pgn`, '[White "') + 8), '"') - 1)
		WHEN `player_color` = 'black' AND instr(`pgn`, '[Black "') > 0
			THEN substr(substr(`pgn`, instr(`pgn`, '[Black "') + 8), 1, instr(substr(`pgn`, instr(`pgn`, '[Black "') + 8), '"') - 1)
	END AS `username`
FROM `games`;--> statement-breakpoint
INSERT INTO `profiles` (`platform`, `username`, `created_at`)
SELECT DISTINCT 'chesscom', o.`username`, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM `game_owner` o
WHERE NOT EXISTS (
	SELECT 1 FROM `profiles` p
	WHERE p.`platform` = 'chesscom' AND lower(p.`username`) = lower(o.`username`)
);--> statement-breakpoint
UPDATE `games` SET `profile_id` = (
	SELECT p.`id` FROM `profiles` p
	JOIN `game_owner` o ON lower(p.`username`) = lower(o.`username`)
	WHERE p.`platform` = 'chesscom' AND o.`id` = `games`.`id`
) WHERE `profile_id` IS NULL;--> statement-breakpoint
DROP VIEW `game_owner`;--> statement-breakpoint
DROP INDEX `games_game_url_unique`;--> statement-breakpoint
CREATE TABLE `__new_games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL REFERENCES profiles(id),
	`game_url` text NOT NULL,
	`pgn` text NOT NULL,
	`opponent` text NOT NULL,
	`player_color` text NOT NULL,
	`result` text NOT NULL,
	`date` text NOT NULL,
	`time_control_category` text NOT NULL,
	`eco` text DEFAULT 'other' NOT NULL,
	`opening_name` text DEFAULT 'Autre / non classée' NOT NULL,
	`move_habits_computed` integer DEFAULT false NOT NULL,
	`analyzed` integer DEFAULT false NOT NULL
);--> statement-breakpoint
INSERT INTO `__new_games` (`id`, `profile_id`, `game_url`, `pgn`, `opponent`, `player_color`, `result`, `date`, `time_control_category`, `eco`, `opening_name`, `move_habits_computed`, `analyzed`)
SELECT `id`, `profile_id`, `game_url`, `pgn`, `opponent`, `player_color`, `result`, `date`, `time_control_category`, `eco`, `opening_name`, `move_habits_computed`, `analyzed` FROM `games`;--> statement-breakpoint
DROP TABLE `games`;--> statement-breakpoint
ALTER TABLE `__new_games` RENAME TO `games`;--> statement-breakpoint
CREATE UNIQUE INDEX `games_profile_id_game_url_unique` ON `games` (`profile_id`,`game_url`);--> statement-breakpoint
--
-- `move_habits` is an aggregate: its rows name no Game and so carry no owner of
-- their own. They can only belong to the Profile the whole pre-Profile database
-- belonged to — and only if there is exactly one. The `HAVING` says precisely
-- that: more than one owner (or none, with habits on the table) yields NULL,
-- and the `NOT NULL` rebuild below turns that into a failed migration rather
-- than a silent attribution to whichever Profile happened to come first.
CREATE TEMP VIEW `legacy_owner` AS
SELECT max(`profile_id`) AS `id` FROM `games` HAVING count(DISTINCT `profile_id`) = 1;--> statement-breakpoint
ALTER TABLE `move_habits` ADD `profile_id` integer REFERENCES profiles(id);--> statement-breakpoint
UPDATE `move_habits` SET `profile_id` = (SELECT `id` FROM `legacy_owner`) WHERE `profile_id` IS NULL;--> statement-breakpoint
CREATE TABLE `__new_move_habits` (
	`profile_id` integer NOT NULL REFERENCES profiles(id),
	`fen` text NOT NULL,
	`side` text NOT NULL,
	`san` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`win` integer DEFAULT 0 NOT NULL,
	`draw` integer DEFAULT 0 NOT NULL,
	`loss` integer DEFAULT 0 NOT NULL,
	`bullet` integer DEFAULT 0 NOT NULL,
	`blitz` integer DEFAULT 0 NOT NULL,
	`rapid` integer DEFAULT 0 NOT NULL,
	`daily` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`profile_id`, `fen`, `side`, `san`)
);--> statement-breakpoint
INSERT INTO `__new_move_habits` (`profile_id`, `fen`, `side`, `san`, `count`, `win`, `draw`, `loss`, `bullet`, `blitz`, `rapid`, `daily`)
SELECT `profile_id`, `fen`, `side`, `san`, `count`, `win`, `draw`, `loss`, `bullet`, `blitz`, `rapid`, `daily` FROM `move_habits`;--> statement-breakpoint
DROP TABLE `move_habits`;--> statement-breakpoint
ALTER TABLE `__new_move_habits` RENAME TO `move_habits`;--> statement-breakpoint
--
-- An `Analysis pass` names its Games, but predates any owner for them; like the
-- habits it belongs to the single pre-Profile owner, on the same terms.
ALTER TABLE `analysis_passes` ADD `profile_id` integer REFERENCES profiles(id);--> statement-breakpoint
UPDATE `analysis_passes` SET `profile_id` = (SELECT `id` FROM `legacy_owner`) WHERE `profile_id` IS NULL;--> statement-breakpoint
CREATE TABLE `__new_analysis_passes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL REFERENCES profiles(id),
	`game_ids` text NOT NULL,
	`total` integer NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text,
	`outcome` text,
	`error` text,
	`acknowledged_at` text
);--> statement-breakpoint
INSERT INTO `__new_analysis_passes` (`id`, `profile_id`, `game_ids`, `total`, `started_at`, `ended_at`, `outcome`, `error`, `acknowledged_at`)
SELECT `id`, `profile_id`, `game_ids`, `total`, `started_at`, `ended_at`, `outcome`, `error`, `acknowledged_at` FROM `analysis_passes`;--> statement-breakpoint
DROP TABLE `analysis_passes`;--> statement-breakpoint
ALTER TABLE `__new_analysis_passes` RENAME TO `analysis_passes`;--> statement-breakpoint
DROP VIEW `legacy_owner`;--> statement-breakpoint
--
-- The one thing `Profile` supersedes rather than owns: `settings` was meant to
-- remember a chess.com username and never did (the table is empty in the real
-- database). The key goes rather than being migrated — the table itself dies
-- with the import form that still reads it.
DELETE FROM `settings` WHERE `key` = 'chesscom_username';
