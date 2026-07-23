CREATE TABLE `move_habits` (
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
	PRIMARY KEY(`fen`, `side`, `san`)
);
--> statement-breakpoint
ALTER TABLE `games` ADD `move_habits_computed` integer DEFAULT false NOT NULL;