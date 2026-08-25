-- Hand-written (ADR-0015), like 0010–0012: the snapshot chain in `meta/` is
-- already unreliable (see 0011's note) and the migrator's journal is what this
-- project actually applies, so the SQL is written rather than generated.
--
-- **Purely additive.** Two new tables and nothing else: no existing table is
-- read, rebuilt or rewritten, so no `Evaluation` — the one thing here that only
-- engine time can rebuild — is anywhere near this migration's path. There is
-- also **nothing to backfill**: a `Personal analysis` has no upstream at all
-- (CONTEXT.md), which is precisely why ADR-0015 applies to it in full.
--
-- **Re-runnable**: `IF NOT EXISTS` on both tables and on the unique index. A
-- second run finds them and does nothing; it does not fail, and it does not
-- half-create anything (a `CREATE TABLE` is atomic, and the migrator runs the
-- whole file in one transaction).
--
-- **Cascades from both parents** (ADR-0014). `personal_analyses` hangs off the
-- `Game` it reads and the `Profile` that owns the reading; `personal_marks`
-- hangs off the analysis. Deleting a Game takes its reading and every mark with
-- it, in one statement, with no application code to remember — a reading of a
-- Game that is gone is not a reading of anything.
CREATE TABLE IF NOT EXISTS `personal_analyses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL REFERENCES `games`(`id`) ON DELETE CASCADE,
	`profile_id` integer NOT NULL REFERENCES `profiles`(`id`) ON DELETE CASCADE,
	`created_at` text NOT NULL,
	-- The seal and its provenance (CONTEXT.md, `Personal analysis`). Null while
	-- the reading is open: the provenance is only ever written at the moment of
	-- sealing, because before that there is nothing to be honest *about*.
	`sealed_at` text,
	`engine_seen_before_seal` integer
);--> statement-breakpoint
-- One reading per Game, enforced by the store rather than by whoever writes: the
-- Player must never have to choose between two of their own readings.
CREATE UNIQUE INDEX IF NOT EXISTS `personal_analyses_game_id_unique` ON `personal_analyses` (`game_id`);--> statement-breakpoint
-- Keyed by `(analysis, ply)` — the same shape of key as `evaluations`, which is
-- what makes US-16b's confrontation a join (ADR-0019). `ply` 0 is the starting
-- Position, exactly as for an `Evaluation`.
--
-- Every judgement column is **nullable and defaultless**: silence is not a
-- value (CONTEXT.md). A Move the Player did not examine has no row here, or a
-- row whose columns are null — never a sentinel that would make "not examined"
-- indistinguishable from a verdict, and so make coverage indistinguishable from
-- correctness.
CREATE TABLE IF NOT EXISTS `personal_marks` (
	`analysis_id` integer NOT NULL REFERENCES `personal_analyses`(`id`) ON DELETE CASCADE,
	`ply` integer NOT NULL,
	`declared_severity` text,
	`note` text,
	`key_moment` integer DEFAULT false NOT NULL,
	-- Written after the seal, hence out of the confrontation and shown as such.
	`posterior` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`analysis_id`, `ply`)
);
