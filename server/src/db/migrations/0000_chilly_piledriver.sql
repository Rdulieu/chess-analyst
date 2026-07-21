CREATE TABLE `games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_url` text NOT NULL,
	`pgn` text NOT NULL,
	`opponent` text NOT NULL,
	`player_color` text NOT NULL,
	`result` text NOT NULL,
	`date` text NOT NULL,
	`time_control_category` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_game_url_unique` ON `games` (`game_url`);