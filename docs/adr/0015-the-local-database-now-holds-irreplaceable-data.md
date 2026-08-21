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
