CREATE TABLE `analysis_passes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_ids` text NOT NULL,
	`total` integer NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text
);
