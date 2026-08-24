-- Hand-written (ADR-0015), like 0010–0013.
--
-- The `Personal analysis`'s marks gain a **second layer**: `posterior` becomes
-- part of the primary key, so one ply may carry two marks — what the Player had
-- written when they **sealed**, and what they wrote afterwards on seeing the
-- engine (CONTEXT.md, `Personal analysis`).
--
-- Why the flag alone was not enough. Sealing must leave *the initial reading
-- readable as it was*. With one row per ply, a post-seal edit has nowhere to go
-- but over the top of the sealed value — which destroys exactly the thing the
-- seal exists to fix. Two layers is the smallest model that keeps both readable,
-- and it caps at two by construction: there is one seal, hence one before and one
-- after.
--
-- **Non-destructive.** Every existing mark is an initial one (nothing has been
-- sealed yet — sealing arrives with this slice), so the copy below preserves them
-- exactly, `posterior = 0` included. Nothing else in the database is read or
-- rebuilt; no `Evaluation` is anywhere near this path.
--
-- **Re-runnable**, and by idempotence rather than by a guard: replaying these
-- four statements over their own result copies the same rows into the same shape
-- and lands on the same schema. (The migrator's journal means it does not in fact
-- replay; that is belt, this is braces. The accompanying test opens the database
-- a second time and asserts the marks are still there — which is the property
-- ADR-0015 actually asks for.)
--
-- `openDb` runs migrations with foreign keys OFF (SQLite's documented
-- table-rebuild procedure) and re-checks every reference afterwards, so a rebuild
-- that really did lose a reference fails loudly rather than leaving the database
-- quietly inconsistent.
CREATE TABLE IF NOT EXISTS `__new_personal_marks` (
	`analysis_id` integer NOT NULL REFERENCES `personal_analyses`(`id`) ON DELETE CASCADE,
	`ply` integer NOT NULL,
	`declared_severity` text,
	`note` text,
	`key_moment` integer DEFAULT false NOT NULL,
	`posterior` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`analysis_id`, `ply`, `posterior`)
);--> statement-breakpoint
INSERT INTO `__new_personal_marks` (`analysis_id`, `ply`, `declared_severity`, `note`, `key_moment`, `posterior`)
SELECT `analysis_id`, `ply`, `declared_severity`, `note`, `key_moment`, `posterior` FROM `personal_marks`;--> statement-breakpoint
DROP TABLE `personal_marks`;--> statement-breakpoint
ALTER TABLE `__new_personal_marks` RENAME TO `personal_marks`;
