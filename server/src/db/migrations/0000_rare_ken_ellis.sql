CREATE TABLE `games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pgn` text NOT NULL,
	`opponent` text NOT NULL,
	`result` text NOT NULL,
	`date` text NOT NULL,
	`time_control_category` text NOT NULL
);
