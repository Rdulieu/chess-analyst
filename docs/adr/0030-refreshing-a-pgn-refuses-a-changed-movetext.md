# Refreshing a Game's PGN replaces it, and refuses when the movetext changed

Without this, a competent agent would delete the row and re-insert it — the shortest path, and the
one the current `insert()` suggests, since it skips a Game whose URL is already there and has no
update path at all. That breaks the foreign key `evaluations` holds on `game_id` and re-counts the
Game's `Move habit`s. The other available mistake is an `UPDATE` of the PGN with no check, which
would silently invalidate the FENs the stored `Evaluation`s were computed against. **The decision**:
the refresh compares the incoming movetext to the stored one and **fails loudly** when they differ,
never skipping and never overwriting on a mismatch.

**Why: 434 Lichess Games must gain the `[%clk]` comments nobody ever asked the export for, and 10
of them are already analysed.** Identical moves yield identical FENs, so those `Evaluation`s survive
a PGN replacement — but that is a claim, and the comparison is what turns it into a checked one.
ADR-0015 does not cover this: it governs changes of **schema**, and this is a change of **data**.

## Consequences

- **The assertion *is* the protection.** It is not a defensive nicety around the real work; it is the
  reason the refresh is allowed to touch a Game that carries irreplaceable engine output at all.
- **Never delete-and-reinsert a Game to update it**, for the two reasons above — both of them silent.
