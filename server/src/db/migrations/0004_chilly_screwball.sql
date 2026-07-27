CREATE TABLE `evaluations` (
	`game_id` integer NOT NULL,
	`ply` integer NOT NULL,
	`cp` integer,
	`mate` integer,
	PRIMARY KEY(`game_id`, `ply`),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `games` ADD `analyzed` integer DEFAULT false NOT NULL;