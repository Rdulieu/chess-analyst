# The local database now holds irreplaceable data

Until now a standing rule (in `CLAUDE.md`, resting on ADR-0002's local-only, pre-prod stance) said
the local SQLite file was **throwaway**: reworking the schema was free, and wiping the database to
re-import was "an acceptable, automatable step, never a blocker". Twelve ADRs were taken under that
licence, and it was right — Import dedups by game URL and is fast, so nothing stored was worth
protecting.

That stopped being true. The database now holds **20 analyzed Games — 1199 `Evaluation`s** produced
by an `Analysis pass`. Import can rebuild Games from chess.com in seconds; **nothing rebuilds
Evaluations but engine time**, and there is no upstream to fetch them from. The asset is no longer
the data we downloaded, it is the data we computed.

So the rule changes, and the boundary matters: **what we lose is the freedom to lose the data, not
the freedom to change the model.** Reworking the schema stays fair game — pick the cleanest design,
as before. What is no longer acceptable is landing that design without a migration that carries the
existing rows across. Concretely, from this decision on:

- Every schema change ships with its **migration script**, written in the same slice as the schema
  it migrates.
- A migration is **non-destructive and re-runnable**, and **fails loudly** rather than leaving rows
  half-assigned — the nullable-column → backfill → `NOT NULL` sequence, with the final tightening
  acting as the assertion.
- "Wipe and re-import" is no longer a plan. It is data loss, and it needs to be named as such.

Re-importing Games remains cheap and stays a legitimate way to *add* or *refresh* Games — it is
only the wipe that is retired.

This is the immediate consequence of the `Profile` work (ADR-0014), which adds a `NOT NULL`
`profile_id` to `games`, `move_habits` and `analysis_passes`. Under the old rule that column would
simply have arrived on an empty database. Under this one it arrives with a script that creates the
`DudulSmash` Profile and assigns all 166 existing Games to it, preserving the 20 analyses.

## Considered options

- **Keep the throwaway rule, wipe and re-analyze.** Rejected: it trades a bounded, one-off cost
  (writing a migration) for an unbounded, recurring one (re-running the engine at every schema
  change), and the recurring cost grows with exactly the thing the project is meant to accumulate.
- **Keep the rule but export/re-import Evaluations by hand around each change.** Rejected: that is
  a migration, written ad hoc, untested and unversioned. If we are moving data across a schema
  change, it belongs in the repository.
- **Freeze the schema instead, to avoid owing migrations.** Rejected: it protects the data by
  sacrificing the design, which is the worse trade at this stage. Migrations are the cost of
  keeping both.

## Consequences

- `CLAUDE.md`'s "Dev phase" section is amended: the schema-rework licence stays, the
  wipe-and-re-import licence is withdrawn.
- ADR-0002 (local-only app) is unaffected in substance — the app stays local and single-user — but
  its "throwaway local data" framing no longer describes reality.
- The absence of any backup means a bad migration is unrecoverable. Migrations run against a copy
  first; that is a practice, not tooling we are building here.

## Note (US-15a, 2026-08-22): one exception taken, and the argument it exposed

US-15a required a `pv` on every `evaluations` row (ADR-0016). The 1199 Evaluations already stored
cannot get one — a line is not recoverable by replay, unlike ADR-0012's FENs — so this decision
pointed at carrying them forward behind a synthetic pass, with a null `pv`. **That was rejected and
those rows were discarded instead.**

The reason is a cost this ADR did not weigh. It compared a **bounded** migration against an
**unbounded, recurring** engine cost, and concluded rightly. But rows that can never be completed
are not carried by a migration script — they are carried by a **permanent branch in the code**: a
degraded state in every reader, a message explaining it, and tests for both, for as long as the rows
exist. Here that meant a forever-branch serving **20 Games worth ~11 minutes** of engine time. The
recurring cost had moved from the engine to the code, which inverts this ADR's own arithmetic.

So the rule stands as written, with its boundary sharpened: **the freedom to lose data is still
withdrawn, and any exception must be named — as this one is.** What is *not* a migration burden is a
schema change whose old rows are **structurally incompletable**; that case is decided on the cost of
the permanent code path, not on the cost of the script. Every other change still owes its migration.

The scope of this exception was kept deliberately narrow: the `evaluations` rows of the analyzed
Games, **not the database**. Profiles, Games, PGNs, openings and `move_habits` were untouched, and
rebuilding was a Player-triggered pass over Games already imported — which is what makes the loss
recoverable in practice, and is exactly the distinction this ADR drew for Import.
