import Database from "better-sqlite3";

/**
 * The one-off correction of **US-28**: a `Personal analysis` whose provenance
 * says the engine had been shown, when the Player had in fact read unaided.
 *
 * ## Why a reading could carry a provenance nobody gave it
 *
 * Until US-28 the `Review mode` was remembered across Games. A level above
 * Unaided, on an analysed Game, is what records the engine as **shown** — and it
 * was recorded at mount. So opening a freshly analysed Game with yesterday's
 * `Détaillé` stamped the reading *before the Player had read a line*, and
 * dropping back to Unaided did not undo it. The reading was then sealed as
 * "read informed", which is what makes a `Confrontation` interpretable.
 *
 * ## What authorises this write — a fact, not a rule
 *
 * `CONTEXT.md` forbids **guessing** a provenance: every fallback is "not seen"
 * and nothing is ever inferred. That binds the *application*. It does not bind
 * the **Player stating a fact about their own readings**, and that is the only
 * ground this script stands on: on 2026-09-03 the requester stated that every
 * reading made so far was made unaided.
 *
 * Read that as narrowly as it is written. Clearing a flag is the **inverse**
 * error of the one US-28 fixes: a wrong "not seen" flatters the Player and
 * overrates the `Confrontation`, where the original defect discredited them.
 * Neither direction may be taken on the app's own authority.
 *
 * ## Why a list of ids and not a query
 *
 * A predicate — "every reading sealed before the fix", "every reading with the
 * flag set" — keeps being true after this run, and would silently clear a
 * provenance that is legitimately set. **The scope is the readings a human
 * named**, which is also why an id that matches nothing, or one that is not
 * sealed, is an error rather than a no-op: the list is the whole safeguard, and
 * a typo in it must not read as "nothing needed correcting".
 *
 * Re-runnable by construction: it writes the value the row is meant to hold, so
 * a second run finds nothing to change and says so.
 */
export function resetProvenance(dbFile: string, ids: number[]): { changed: number } {
  const db = new Database(dbFile);
  try {
    // Checked and written in ONE transaction: a partially applied correction on
    // rows nobody can list afterwards is worse than none at all.
    const apply = db.transaction((wanted: number[]) => {
      const rows = db
        .prepare(
          `SELECT id, sealed_at FROM personal_analyses WHERE id IN (${wanted.map(() => "?").join(",")})`,
        )
        .all(...wanted) as { id: number; sealed_at: string | null }[];

      const missing = wanted.filter((id) => !rows.some((row) => row.id === id));
      if (missing.length > 0) {
        throw new Error(
          `no Personal analysis with id ${missing.join(", ")} — the list of ids is the whole scope of this correction, so an id that names nothing is a mistake in the list, not an empty run`,
        );
      }

      const unsealed = rows.filter((row) => row.sealed_at === null).map((row) => row.id);
      if (unsealed.length > 0) {
        throw new Error(
          `Personal analysis ${unsealed.join(", ")} is not sealed, so it has no provenance to reset — a provenance is written at sealing, and inventing one before that is the guess this correction exists to avoid`,
        );
      }

      const result = db
        .prepare(
          `UPDATE personal_analyses SET engine_seen_before_seal = 0
             WHERE id IN (${wanted.map(() => "?").join(",")}) AND engine_seen_before_seal <> 0`,
        )
        .run(...wanted);
      return result.changes;
    });

    return { changed: apply(ids) };
  } finally {
    db.close();
  }
}
